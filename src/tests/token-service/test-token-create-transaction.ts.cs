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
        public virtual TokenResponse CreateToken(TokenCreateParams @params)
        {
            TokenCreateTransaction tokenCreateTransaction = TransactionBuilders.TokenBuilder.BuildCreate(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(tokenCreateTransaction, client);
            TransactionReceipt transactionReceipt = tokenCreateTransaction.Execute(client).GetReceipt(client);
            string tokenId = "";
            if (transactionReceipt.Status == ResponseStatus.Success)
            {
                tokenId = transactionReceipt.TokenId.ToString();
            }

            return new TokenResponse(tokenId, transactionReceipt.Status);
        }
    }
}