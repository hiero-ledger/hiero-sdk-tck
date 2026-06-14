// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using Hiero.SDK;
using Hiero.SDK.Consensus;
using Hiero.TCK.Tests.TopicService.Params;
using Hiero.TCK.Tests.TopicService.Responses;
using Hiero.SDK.Core;

namespace Hiero.TCK.Tests.TopicService
{
    public partial class TestTopic
    {
        public virtual TopicResponse CreateTopic(CreateTopicParams @params)
        {
            TopicCreateTransaction transaction = TransactionBuilders.TopicBuilder.BuildCreate(@params);
            
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);

            TransactionResponse txResponse = transaction.Execute(client, response =>
            {
                response.ValidateStatus = true;
            });
            TransactionReceipt receipt = txResponse.GetReceipt(client);

            return new TopicResponse(receipt.Status switch
            {
                SDK.ResponseStatus.Success => receipt.TopicId?.ToString() ?? "",

                _ => ""
            }
            , receipt.Status);
        }
    }
}