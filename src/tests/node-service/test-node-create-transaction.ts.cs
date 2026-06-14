// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Networking;
using Hiero.TCK.Tests.NodeService.Params;
using Hiero.TCK.Tests.NodeService.Responses;
using Hiero.TCK.Util;

using Org.BouncyCastle.Utilities.Encoders;

using System.Linq;

namespace Hiero.TCK.Tests.NodeService
{
    public partial class TestNode
    {
        public virtual NodeResponse CreateNode(NodeCreateParams @params)
        {
            NodeCreateTransaction tx = new () { GrpcDeadline = DEFAULT_GRPC_DEADLINE };

            Client client = sdkService.GetClient(@params.SessionId);
            
            if (@params.AccountId is not null) tx.AccountId = AccountId.FromString(@params.AccountId);
            if (@params.Description is not null) tx.Description = @params.Description;
            if (@params.GossipEndpoints is not null) tx.GossipEndpoints = [ .. @params.GossipEndpoints.Select(_ => _.ToSdkEndpoint()) ];
            if (@params.ServiceEndpoints is not null) tx.ServiceEndpoints = [ .. @params.ServiceEndpoints.Select(_ => _.ToSdkEndpoint()) ];
            if (@params.GossipCaCertificate is not null) tx.GossipCaCertificate = Hex.Decode(@params.GossipCaCertificate);
            if (@params.GrpcCertificateHash is not null) tx.GrpcCertificateHash = Hex.Decode(@params.GrpcCertificateHash);
            if (@params.GrpcWebProxyEndpoint is not null) tx.GrpcWebProxyEndpoint = @params.GrpcWebProxyEndpoint.ToSdkEndpoint();
            if (@params.AdminKey is not null) tx.AdminKey = KeyUtils.GetKeyFromString(@params.AdminKey);
            if (@params.DeclineReward is not null) tx.DeclineReward = @params.DeclineReward;

            @params.CommonTransactionParams?.FillOutTransaction(tx, client);
            
            TransactionReceipt receipt = tx.Execute(client).GetReceipt(client);
            
            return new NodeResponse(receipt.NodeId > 0 ? receipt.NodeId.ToString() : "", receipt.Status);
        }
    }
}