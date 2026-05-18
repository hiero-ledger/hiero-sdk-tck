// SPDX-License-Identifier: Apache-2.0
using Google.Protobuf;

using Hiero.SDK.Contract;
using Hiero.SDK.Cryptocurrency;
using Hiero.TCK.Tests.ContractService.Params;
using Hiero.TCK.Tests.ContractService.Responses;
using Hiero.TCK.Util;

using System;

namespace Hiero.TCK.Tests.ContractService
{
    public partial class TestContract 
    {
        public virtual ContractResponse UpdateContract(UpdateContractParams @params)
        {
            var transaction = new ContractUpdateTransaction();
            var client = sdkService.GetClient(@params.SessionId);
            
            if (!string.IsNullOrEmpty(@params.ContractId))
                transaction.ContractId = ContractId.FromString(@params.ContractId);
            
            if (!string.IsNullOrEmpty(@params.AdminKey))
            {
                try
                {
                    transaction.AdminKey = KeyUtils.GetKeyFromString(@params.AdminKey);
                }
                catch (InvalidProtocolBufferException e)
                {
                    throw new ArgumentException(e.Message, e);
                }
            }
            
            if (!string.IsNullOrEmpty(@params.AutoRenewPeriod))
                transaction.AutoRenewPeriod = TimeSpan.FromSeconds(long.Parse(@params.AutoRenewPeriod));
            
            if (!string.IsNullOrEmpty(@params.AutoRenewAccountId))
                transaction.AutoRenewAccountId = AccountId.FromString(@params.AutoRenewAccountId);
            
            if (!string.IsNullOrEmpty(@params.StakedAccountId))
                transaction.StakedAccountId = AccountId.FromString(@params.StakedAccountId);
            
            if (!string.IsNullOrEmpty(@params.StakedNodeId))
                transaction.StakedNodeId = long.Parse(@params.StakedNodeId);
            
            if (@params.DeclineStakingReward ?? false)
                transaction.DeclineStakingReward = true;
            
            if (!string.IsNullOrEmpty(@params.Memo))
                transaction.ContractMemo = @params.Memo;
            
            if (@params.MaxAutomaticTokenAssociations > 0)
                transaction.MaxAutomaticTokenAssociations = (int)@params.MaxAutomaticTokenAssociations;
            
            if (!string.IsNullOrEmpty(@params.ExpirationTime))
            {
                try
                {
                    long expirationTimeSeconds = long.Parse(@params.ExpirationTime);
                    transaction.ExpirationTime = DateTimeOffset.FromUnixTimeSeconds(expirationTimeSeconds).DateTime;
                }
                catch (FormatException e)
                {
                    throw new ArgumentException("Invalid expiration time: " + @params.ExpirationTime, e);
                }
            }
            
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            
            var receipt = transaction.Execute(client).GetReceipt(client);

            return new ContractResponse(null, receipt.Status);
        }
    }
}