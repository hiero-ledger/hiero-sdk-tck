// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Token;
using Hedera.Hashgraph.TCK.Util;
using Hedera.Hashgraph.TCK.Tests.TokenService.Params;
using Hedera.Hashgraph.TCK.Tests.TokenService.Responses;
using Hedera.Hashgraph.SDK.Core;

namespace Hedera.Hashgraph.TCK.Tests.TokenService
{
    public partial class TokenService 
    {
        public virtual TokenResponse DeleteToken(TokenDeleteParams @params)
        {
            TokenDeleteTransaction tokenDeleteTransaction = TransactionBuilders.TokenBuilder.BuildDelete(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(tokenDeleteTransaction, client);
            TransactionReceipt transactionReceipt = tokenDeleteTransaction.Execute(client).GetReceipt(client);
            return new TokenResponse("", transactionReceipt.Status);
        }
    }
}