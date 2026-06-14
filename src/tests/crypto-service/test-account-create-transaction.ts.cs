// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.CryptoService.Params;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount 
    {
        public virtual AccountResponse CreateAccount(AccountCreateParams @params)
        {
            var accountCreateTransaction = TransactionBuilders.AccountBuilder.BuildCreate(@params);
            var client = sdkService.GetClient(@params.SessionId);
            
            @params.CommonTransactionParams?.FillOutTransaction(accountCreateTransaction, client);
            
            var transactionReceipt = accountCreateTransaction.Execute(client).GetReceipt(client);
            string stringAccountId = "";
            if (transactionReceipt.Status == SDK.ResponseStatus.Success)
            {
                stringAccountId = transactionReceipt.AccountId?.ToString() ?? "";
            }

            return new AccountResponse(stringAccountId, transactionReceipt.Status);
        }
    }
}