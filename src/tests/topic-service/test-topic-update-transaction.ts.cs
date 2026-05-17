// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.TCK.Util;

using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Consensus;
using Hedera.Hashgraph.TCK.Tests.TopicService.Params;
using Hedera.Hashgraph.TCK.Tests.TopicService.Responses;
using Hedera.Hashgraph.SDK.Core;

namespace Hedera.Hashgraph.TCK.Tests.TopicService
{
    public partial class TestTopic 
    {
        public virtual TopicResponse UpdateTopic(UpdateTopicParams @params)
        {
            TopicUpdateTransaction transaction = TransactionBuilders.TopicBuilder.BuildUpdate(@params);

            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            TransactionResponse txResponse = transaction.Execute(client, response =>
            {
                response.ValidateStatus = true;
            });
            TransactionReceipt receipt = txResponse.GetReceipt(client);

            return new TopicResponse(null, receipt.Status);
        }
    }
}
