// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Core;
using Hedera.Hashgraph.SDK.Schedule;
using Hedera.Hashgraph.TCK.Tests.ScheduleService.Params;
using Hedera.Hashgraph.TCK.Tests.ScheduleService.Responses;

namespace Hedera.Hashgraph.TCK.Tests.ScheduleService
{
    public partial class TestSchedule
    {
        public virtual ScheduleResponse SignSchedule(ScheduleSignParams @params)
        {
            ScheduleSignTransaction transaction = new ()
            {
                GrpcDeadline = DEFAULT_GRPC_DEADLINE
            };
            
            Client client = sdkService.GetClient(@params.SessionId);

            if (@params.ScheduleId is not null) transaction.ScheduleId = ScheduleId.FromString(@params.ScheduleId);

            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);

            TransactionResponse txResponse = transaction.Execute(client);
            TransactionReceipt receipt = txResponse.GetReceipt(client);

            string scheduleId = "";
            string transactionId = "";

            if (receipt.Status == ResponseStatus.Success)
            {
                if (@params.ScheduleId is not null)
                {
                    scheduleId = @params.ScheduleId;
                }

                if (receipt.ScheduledTransactionId != null)
                {
                    transactionId = receipt.ScheduledTransactionId.ToString();
                }
            }

            return new ScheduleResponse(scheduleId, transactionId, receipt.Status);
        }
    }
}