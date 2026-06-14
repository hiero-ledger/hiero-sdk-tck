// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.Schedule;
using Hiero.TCK.Tests.ScheduleService.Params;
using Hiero.TCK.Tests.ScheduleService.Responses;

namespace Hiero.TCK.Tests.ScheduleService
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