// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Core;
using Hedera.Hashgraph.SDK.Cryptocurrency;
using Hedera.Hashgraph.TCK.Tests.CryptoService.Params;
using Hedera.Hashgraph.TCK.Tests.CryptoService.Responses;
using Hedera.Hashgraph.TCK.Util;

namespace Hedera.Hashgraph.TCK.Tests.CryptoService
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