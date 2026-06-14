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
        public virtual Dictionary<string, string> CancelAirdrop(TokenAirdropCancelParams @params)
        {
            TokenCancelAirdropTransaction tokenCancelAirdropTransaction = TransactionBuilders.TokenBuilder.BuildCancelAirdrop(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(tokenCancelAirdropTransaction, client);
            TransactionResponse txResponse = tokenCancelAirdropTransaction.Execute(client);
            TransactionReceipt receipt = txResponse.GetReceipt(client);

            return new Dictionary<string, string>
            {
                { "status", receipt.Status.ToString() }
            };
        }
    }
}