// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Core;
using Hedera.Hashgraph.SDK.Cryptocurrency;
using Hedera.Hashgraph.SDK.Schedule;
using Hedera.Hashgraph.TCK.Tests.ScheduleService.Params;
using Hedera.Hashgraph.TCK.Tests.ScheduleService.Responses;
using Hedera.Hashgraph.TCK.Util;

using System;

namespace Hedera.Hashgraph.TCK.Tests.ScheduleService
{
    public partial class TestSchedule
    {
        public virtual ScheduleResponse CreateSchedule(ScheduleCreateParams @params)
        {
            ScheduleCreateTransaction transaction = new()
            {
                GrpcDeadline = DEFAULT_GRPC_DEADLINE
            };
            Client client = sdkService.GetClient(@params.SessionId);

            if (@params.Transaction is not null)
                try
                {
                    ITransaction tx = BuildScheduledTransaction(@params.Transaction, @params.SessionId);
                    
                    //transaction.ScheduledTransactionBody = tx;
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to build scheduled transaction", e);
                }

            if (@params.Memo is not null)
                transaction.ScheduleMemo = @params.Memo;

            if (@params.AdminKey is not null)
                try
                {
                    transaction.AdminKey = KeyUtils.GetKeyFromString(@params.AdminKey);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Invalid admin key format", e);
                }

            if (@params.PayerAccountId is not null)
                transaction.PayerAccountId = AccountId.FromString(@params.PayerAccountId);

            if (@params.ExpirationTime is not null)
            {
                try
                {
                    long expirationTimeSeconds = long.Parse(@params.ExpirationTime);

                    transaction.ExpirationTime = DateTimeOffset.FromUnixTimeSeconds(expirationTimeSeconds);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Invalid expiration time: " + @params.ExpirationTime, e);
                }
            };

            if (@params.WaitForExpiry is not null)
                transaction.WaitForExpiry = @params.WaitForExpiry.Value;

            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            
            TransactionResponse txResponse = transaction.Execute(client);
            TransactionReceipt receipt = txResponse.GetReceipt(client);
            
            string scheduleId = "";
            string transactionId = "";

            if (receipt.Status == ResponseStatus.Success)
            {
                //if (@params.ScheduleId is not null)
                //{
                //    scheduleId = @params.ScheduleId;
                //}

                if (receipt.ScheduledTransactionId != null)
                {
                    transactionId = receipt.ScheduledTransactionId.ToString();
                }
            }

            return new ScheduleResponse(scheduleId, transactionId, receipt.Status);
        }
    }
}