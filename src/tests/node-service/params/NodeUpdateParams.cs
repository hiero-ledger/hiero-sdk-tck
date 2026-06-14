// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.NodeService.Params
{
    public class NodeUpdateParams : Parameters
    {
        public NodeUpdateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            NodeId = parameters["nodeId"] as string;
            AccountId = parameters["accountId"] as string;
            Description = parameters["description"] as string;

            if (parameters.ContainsKey("gossipEndpoints"))
            {
                object[] arr = parameters["gossipEndpoints"] as object[];
                GossipEndpoints = [ .. arr.Select(o => new ServiceEndpointParams(o as Dictionary<string, object>)) ];
            }

            if (parameters.ContainsKey("serviceEndpoints"))
            {
                object[] arr = parameters["serviceEndpoints"] as object[];
                ServiceEndpoints = [ .. arr.Select(o => new ServiceEndpointParams(o as Dictionary<string, object>)) ];
            }

            GossipCaCertificate = parameters["gossipCaCertificate"] as string;
            GrpcCertificateHash = parameters["grpcCertificateHash"] as string;

            if (parameters.ContainsKey("grpcWebProxyEndpoint"))
            {
                GrpcWebProxyEndpoint = new ServiceEndpointParams(parameters["grpcWebProxyEndpoint"] as Dictionary<string, object>);
            }

            AdminKey = parameters["adminKey"] as string;
            DeclineReward = parameters["declineReward"] as bool?;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? NodeId { get; private set; }
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