// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Contract;
using Hiero.SDK.Cryptocurrency;
using Hiero.TCK.Tests.ContractService.Params;
using Hiero.TCK.Tests.ContractService.Responses;

namespace Hiero.TCK.Tests.ContractService
{
    public partial class TestContract 
    {
        public virtual ContractResponse DeleteContract(DeleteContractParams @params)
        {
            var transaction = new ContractDeleteTransaction();
            var client = sdkService.GetClient(@params.SessionId);
            
            if (!string.IsNullOrEmpty(@params.ContractId))
                transaction.ContractId = ContractId.FromString(@params.ContractId);
            
            if (!string.IsNullOrEmpty(@params.TransferAccountId))
                transaction.TransferAccountId = AccountId.FromString(@params.TransferAccountId);
            
            if (!string.IsNullOrEmpty(@params.TransferContractId))
                transaction.TransferContractId = ContractId.FromString(@params.TransferContractId);
            
            if (@params.PermanentRemoval ?? false)
                transaction.PermanentRemoval = true;
            
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            
            var receipt = transaction.Execute(client).GetReceipt(client);

            return new ContractResponse(null, receipt.Status);
        }
    }
}