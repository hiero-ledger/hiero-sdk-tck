// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.Cryptocurrency;
using Hiero.TCK.Tests.CryptoService.Params;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount 
    {
        public virtual AccountResponse DeleteAccount(AccountDeleteParams @params)
        {
            AccountDeleteTransaction accountDeleteTransaction = TransactionBuilders.AccountBuilder.BuildDelete(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            
            @params.CommonTransactionParams?.FillOutTransaction(accountDeleteTransaction, client);
            TransactionReceipt transactionReceipt = accountDeleteTransaction.Execute(client).GetReceipt(client);

            return new AccountResponse(null, transactionReceipt.Status);
        }
    }
}