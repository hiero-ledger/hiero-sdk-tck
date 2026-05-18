// SPDX-License-Identifier: Apache-2.0
using Google.Protobuf;

using Hiero.SDK;
using Hiero.SDK.Contract;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.File;
using Hiero.TCK.Tests.ContractService.Params;
using Hiero.TCK.Tests.ContractService.Responses;
using Hiero.TCK.Util;

using Org.BouncyCastle.Utilities.Encoders;

using System;

namespace Hiero.TCK.Tests.ContractService
{
    public partial class TestContract 
    {
        public virtual ContractResponse CreateContract(CreateContractParams @params)
        {
            var transaction = new ContractCreateTransaction();
            var client = sdkService.GetClient(@params.SessionId);
            
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
            
            if (!string.IsNullOrEmpty(@params.Gas))
                transaction.Gas = long.Parse(@params.Gas);
            
            if (!string.IsNullOrEmpty(@params.AutoRenewAccountId))
                transaction.AutoRenewAccountId = AccountId.FromString(@params.AutoRenewAccountId);
            
            if (!string.IsNullOrEmpty(@params.InitialBalance))
                transaction.InitialBalance = Hbar.FromTinybars(long.Parse(@params.InitialBalance));
            
            if (!string.IsNullOrEmpty(@params.Initcode))
                transaction.Bytecode = Hex.Decode(@params.Initcode);
            
            if (!string.IsNullOrEmpty(@params.BytecodeFileId))
                transaction.BytecodeFileId = FileId.FromString(@params.BytecodeFileId);
            
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
            
            if (!string.IsNullOrEmpty(@params.ConstructorParameters))
                transaction.ConstructorParameters = ByteString.CopyFromUtf8(@params.ConstructorParameters);
            
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            
            var receipt = transaction.Execute(client).GetReceipt(client);
            string contractId = "";
            if (receipt.Status == ResponseStatus.Success && receipt.ContractId != null)
            {
                contractId = receipt.ContractId.ToString();
            }

            return new ContractResponse(contractId, receipt.Status);
        }
    }
}