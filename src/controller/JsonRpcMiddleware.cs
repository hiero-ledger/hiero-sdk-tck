// SPDX-License-Identifier: Apache-2.0
using System;
using System.IO;
using System.Threading.Tasks;
using System.Text.Json;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;

using StreamJsonRpc;

using Hiero.TCK.Config;

namespace Hiero.TCK.Controller
{
    public class JsonRpcMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly JsonRpcServiceHandler _handler;

        public JsonRpcMiddleware(RequestDelegate next, JsonRpcServiceHandler handler)
        {
            _next = next;
            _handler = handler;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Method == "POST" &&
                context.Request.ContentType?.Contains("application/json") == true)
            {
                try
                {
                    context.Request.EnableBuffering();
                    using var reader = new StreamReader(context.Request.Body);
                    var body = await reader.ReadToEndAsync();
                    context.Request.Body.Position = 0;

                    var result = await _handler.ProcessAsync(body);
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(result);
                    return;
                }
                catch (Exception ex)
                {
                    context.Response.ContentType = "application/json";
                    context.Response.StatusCode = 200;
                    var errorResponse = new { jsonrpc = "2.0", error = new { code = -32700, message = "Parse error" }, id = (object?)null };
                    await context.Response.WriteAsJsonAsync(errorResponse);
                    return;
                }
            }

            await _next(context);
        }
    }

    public static class JsonRpcMiddlewareExtensions
    {
        public static IApplicationBuilder UseJsonRpcMiddleware(this IApplicationBuilder builder)
        {
            builder.UseMiddleware<JsonRpcMiddleware>();
            return builder;
        }
    }
}
