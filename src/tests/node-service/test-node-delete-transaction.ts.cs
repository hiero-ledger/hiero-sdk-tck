// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.Networking;
using Hiero.TCK.Tests.NodeService.Params;
using Hiero.TCK.Tests.NodeService.Responses;

namespace Hiero.TCK.Tests.NodeService
{
    public partial class TestNode
    {
        public virtual NodeResponse DeleteNode(NodeDeleteParams @params)
        {
            NodeDeleteTransaction tx = new() { GrpcDeadline = DEFAULT_GRPC_DEADLINE };

            Client client = sdkService.GetClient(@params.SessionId);

            if (@params.NodeId is not null) tx.NodeId = ulong.Parse(@params.NodeId);

            @params.CommonTransactionParams?.FillOutTransaction(tx, client);

            TransactionReceipt receipt = tx.Execute(client).GetReceipt(client);

            return new NodeResponse(receipt.NodeId > 0 ? receipt.NodeId.ToString() : "", receipt.Status);
        }
    }
}