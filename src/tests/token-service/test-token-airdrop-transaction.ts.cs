// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Token;
using Hedera.Hashgraph.TCK.Util;
using Hedera.Hashgraph.TCK.Tests.TokenService.Params;

using System.Collections.Generic;
using Hedera.Hashgraph.SDK.Core;

namespace Hedera.Hashgraph.TCK.Tests.TokenService
{
    public partial class TokenService 
    {
        public virtual Dictionary<string, string> AirdropToken(TokenAirdropParams @params)
        {
            TokenAirdropTransaction tokenAirdropTransaction = TransactionBuilders.TokenBuilder.BuildAirdrop(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(tokenAirdropTransaction, client);
            TransactionResponse txResponse = tokenAirdropTransaction.Execute(client);
            TransactionReceipt receipt = txResponse.GetReceipt(client);

            return new Dictionary<string, string>
            {
                { "status", receipt.Status.ToString() }
            };
        }
    }
}