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
        public virtual TokenResponse UpdateToken(TokenUpdateParams @params)
        {
            TokenUpdateTransaction tokenUpdateTransaction = TransactionBuilders.TokenBuilder.BuildUpdate(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(tokenUpdateTransaction, client);
            TransactionReceipt transactionReceipt = tokenUpdateTransaction.Execute(client).GetReceipt(client);
            
            return new TokenResponse("", transactionReceipt.Status);
        }
    }
}