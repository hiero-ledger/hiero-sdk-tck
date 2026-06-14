// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.CryptoService.Params;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount 
    {
        public virtual AccountAllowanceResponse DeleteAllowance(AccountAllowanceParams @params)
        {
            var tx = TransactionBuilders.AccountBuilder.BuildDeleteAllowance(@params);
            var client = sdkService.GetClient(@params.SessionId);
            
            @params.CommonTransactionParams?.FillOutTransaction(tx, client);
            
            var transactionReceipt = tx.Execute(client).GetReceipt(client);

            return new AccountAllowanceResponse(transactionReceipt.Status);
        }
    }
}