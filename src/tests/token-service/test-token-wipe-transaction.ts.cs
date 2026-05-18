// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Token;
using Hiero.TCK.Util;
using Hiero.TCK.Tests.TokenService.Params;

using System.Collections.Generic;
using Hiero.SDK.Core;

namespace Hiero.TCK.Tests.TokenService
{
    public partial class TokenService 
    {
        public virtual Dictionary<string, string> WipeToken(TokenWipeParams @params)
        {
            TokenWipeTransaction tokenWipeTransaction = TransactionBuilders.TokenBuilder.BuildWipe(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(tokenWipeTransaction, client);
            TransactionReceipt receipt = tokenWipeTransaction.Execute(client).GetReceipt(client);

            return new Dictionary<string, string> { { "status", receipt.Status.ToString() } };
        }
    }
}