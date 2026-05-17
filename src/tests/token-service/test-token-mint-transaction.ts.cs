// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Token;
using Hedera.Hashgraph.TCK.Util;
using Hedera.Hashgraph.TCK.Tests.TokenService.Params;

using System.Linq;
using Hedera.Hashgraph.TCK.Tests.TokenService.Responses;
using Hedera.Hashgraph.SDK.Core;

namespace Hedera.Hashgraph.TCK.Tests.TokenService
{
    public partial class TokenService 
    {
        public virtual TokenMintResponse MintToken(MintTokenParams @params)
        {
            TokenMintTransaction transaction = TransactionBuilders.TokenBuilder.BuildMint(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            TransactionReceipt receipt = transaction.Execute(client).GetReceipt(client);

            return new TokenMintResponse("", receipt.Status, receipt.TotalSupply.ToString(), receipt.Serials.Select(_ => _.ToString()).ToList());
        }
    }
}