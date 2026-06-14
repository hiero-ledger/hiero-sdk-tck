// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Token;
using Hiero.TCK.Util;
using Hiero.TCK.Tests.TokenService.Params;
using Hiero.TCK.Tests.TokenService.Responses;
using Hiero.SDK.Core;

namespace Hiero.TCK.Tests.TokenService
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