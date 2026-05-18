// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;

using StreamJsonRpc;

using Hiero.TCK.Tests;
using Hiero.TCK.Tests.CryptoService;
using Hiero.TCK.Tests.TokenService;
using Hiero.TCK.Tests.ContractService;
using Hiero.TCK.Tests.FileService;
using Hiero.TCK.Tests.TopicService;
using Hiero.TCK.Tests.ScheduleService;
using Hiero.TCK.Tests.NodeService;

namespace Hiero.TCK.Config
{
    public class JsonRpcServiceHandler
    {
        private readonly Dictionary<string, ServiceMethodHandler> _methodHandlers;
        private readonly IServiceProvider _serviceProvider;

        public JsonRpcServiceHandler(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
            _methodHandlers = new Dictionary<string, ServiceMethodHandler>();
            RegisterAllServiceMethods();
        }

        private void RegisterAllServiceMethods()
        {
            var serviceTypes = new Type[]
            {
                typeof(SdkService),
                typeof(CryptoService),
                typeof(TokenService),
                typeof(ContractService),
                typeof(FileService),
                typeof(TopicService),
                typeof(ScheduleService),
                typeof(NodeService),
            };

            foreach (var serviceType in serviceTypes)
            {
                var methods = serviceType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
                foreach (var method in methods)
                {
                    if (method.ReturnType != typeof(void) && !method.Name.StartsWith("get_", StringComparison.OrdinalIgnoreCase))
                    {
                        var methodName = ConvertToSnakeCase(method.Name);
                        _methodHandlers[methodName] = new ServiceMethodHandler
                        {
                            ServiceType = serviceType,
                            Method = method,
                            MethodName = method.Name
                        };
                    }
                }
            }
        }

        public async Task<string> ProcessAsync(string jsonRpcRequestText)
        {
            try
            {
                var requestOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var request = JsonSerializer.Deserialize<JsonRpcRequest>(jsonRpcRequestText, requestOptions);

                if (request == null || string.IsNullOrEmpty(request.Method))
                {
                    return CreateErrorResponseJson(null, -32600, "Invalid Request");
                }

                if (!_methodHandlers.TryGetValue(request.Method, out var handler))
                {
                    return CreateErrorResponseJson(request.Id, -32601, $"Method not found: {request.Method}");
                }

                var service = _serviceProvider.GetService(handler.ServiceType);
                if (service == null)
                {
                    return CreateErrorResponseJson(request.Id, -32603, "Service not found");
                }

                object? result = null;
                var methodParams = handler.Method.GetParameters();

                if (methodParams.Length > 0)
                {
                    var paramType = methodParams[0].ParameterType;
                    var paramsJson = request.Params?.ToString() ?? "{}";

                    var paramInstance = JsonSerializer.Deserialize(paramsJson, paramType, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                    });

                    result = handler.Method.Invoke(service, new[] { paramInstance });
                }
                else
                {
                    result = handler.Method.Invoke(service, null);
                }

                if (result is Task task)
                {
                    await task;
                    var resultProperty = task.GetType().GetProperty("Result");
                    result = resultProperty?.GetValue(task);
                }

                return CreateSuccessResponseJson(request.Id, result);
            }
            catch (TargetInvocationException ex)
            {
                var innerException = ex.InnerException ?? ex;
                return CreateErrorResponseJson(null, -32603, innerException.Message);
            }
            catch (Exception ex)
            {
                return CreateErrorResponseJson(null, -32603, ex.Message);
            }
        }

        private string CreateSuccessResponseJson(object? id, object? result)
        {
            var response = new
            {
                jsonrpc = "2.0",
                result,
                id
            };
            return JsonSerializer.Serialize(response);
        }

        private string CreateErrorResponseJson(object? id, int code, string message)
        {
            var response = new
            {
                jsonrpc = "2.0",
                error = new
                {
                    code,
                    message
                },
                id
            };
            return JsonSerializer.Serialize(response);
        }

        private static string ConvertToSnakeCase(string str)
        {
            var result = new System.Text.StringBuilder();
            for (int i = 0; i < str.Length; i++)
            {
                if (char.IsUpper(str[i]) && i > 0)
                {
                    result.Append('_');
                }
                result.Append(char.ToLower(str[i]));
            }
            return result.ToString();
        }

        private class ServiceMethodHandler
        {
            public Type? ServiceType { get; set; }
            public MethodInfo? Method { get; set; }
            public string? MethodName { get; set; }
        }
    }

    public class JsonRpcRequest
    {
        [JsonPropertyName("jsonrpc")]
        public string? JsonRpc { get; set; }

        [JsonPropertyName("method")]
        public string? Method { get; set; }

        [JsonPropertyName("params")]
        public JsonElement? Params { get; set; }

        [JsonPropertyName("id")]
        public object? Id { get; set; }
    }
}
