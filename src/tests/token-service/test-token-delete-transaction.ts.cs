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