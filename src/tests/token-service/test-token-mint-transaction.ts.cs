// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Token;
using Hiero.TCK.Util;
using Hiero.TCK.Tests.TokenService.Params;

using System.Linq;
using Hiero.TCK.Tests.TokenService.Responses;
using Hiero.SDK.Core;

namespace Hiero.TCK.Tests.TokenService
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