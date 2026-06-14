// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.CryptoService.Params;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount 
    {
        public virtual AccountResponse UpdateAccount(AccountUpdateParams @params)
        {
            var accountUpdateTransaction = TransactionBuilders.AccountBuilder.BuildUpdate(@params);
            var client = sdkService.GetClient(@params.SessionId);
            
            @params.CommonTransactionParams?.FillOutTransaction(accountUpdateTransaction, client);
            
            var transactionReceipt = accountUpdateTransaction.Execute(client).GetReceipt(client);

            return new AccountResponse(null, transactionReceipt.Status);
        }
    }
}