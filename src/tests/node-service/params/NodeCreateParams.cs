// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Hiero.TCK.Tests.NodeService.Params
{
    public class NodeCreateParams : Parameters
    {
        public NodeCreateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            AccountId = parameters.TryGetValue("accountId", out var accountIdObj)
                ? accountIdObj as string
                : null;

            Description = parameters.TryGetValue("description", out var descObj)
                ? descObj as string
                : null;

            if (parameters.TryGetValue("gossipEndpoints", out var gossipObj) &&
                gossipObj is JsonElement gossipElement &&
                gossipElement.ValueKind == JsonValueKind.Array)
            {
                GossipEndpoints = gossipElement
                    .EnumerateArray()
                    .Select(e => JsonSerializer.Deserialize<Dictionary<string, object>>(e.GetRawText()))
                    .Select(dict => new ServiceEndpointParams(dict))
                    .ToList();
            }

            if (parameters.TryGetValue("serviceEndpoints", out var serviceObj) &&
                serviceObj is JsonElement serviceElement &&
                serviceElement.ValueKind == JsonValueKind.Array)
            {
                ServiceEndpoints = serviceElement
                    .EnumerateArray()
                    .Select(e => JsonSerializer.Deserialize<Dictionary<string, object>>(e.GetRawText()))
                    .Select(dict => new ServiceEndpointParams(dict))
                    .ToList();
            }

            GossipCaCertificate = parameters.TryGetValue("gossipCaCertificate", out var gossipCertObj)
                ? gossipCertObj as string
                : null;

            GrpcCertificateHash = parameters.TryGetValue("grpcCertificateHash", out var grpcHashObj)
                ? grpcHashObj as string
                : null;

            if (parameters.TryGetValue("grpcWebProxyEndpoint", out var proxyObj) &&
                proxyObj is JsonElement proxyElement &&
                proxyElement.ValueKind == JsonValueKind.Object)
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(proxyElement.GetRawText());
                GrpcWebProxyEndpoint = new ServiceEndpointParams(dict);
            }

            AdminKey = parameters.TryGetValue("adminKey", out var adminKeyObj)
                ? adminKeyObj as string
                : null;

            DeclineReward = parameters.TryGetValue("declineReward", out var declineObj)
                ? declineObj as bool?
                : null;

            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? AccountId { get; private set; }
        public string? Description { get; private set; }
        public IList<ServiceEndpointParams>? GossipEndpoints { get; private set; }
        public IList<ServiceEndpointParams>? ServiceEndpoints { get; private set; }
        public string? GossipCaCertificate { get; private set; }
        public string? GrpcCertificateHash { get; private set; }
        public ServiceEndpointParams? GrpcWebProxyEndpoint { get; private set; }
        public string? AdminKey { get; private set; }
        public bool? DeclineReward { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}