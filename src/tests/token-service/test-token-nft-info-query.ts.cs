// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Nfts;
using Hiero.TCK.Util;
using Hiero.TCK.Tests.TokenService.Params;
using Hiero.TCK.Tests.TokenService.Responses;

using System.Collections.Generic;

using Org.BouncyCastle.Utilities.Encoders;

namespace Hiero.TCK.Tests.TokenService
{
    public partial class TokenService 
    {
        public virtual NftInfoResponse GetNftInfo(NftInfoQueryParams @params)
        {
            TokenNftInfoQuery query = QueryBuilders.TokenBuilder.BuildNftInfo(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            IList<TokenNftInfo> txResponse = query.Execute(client);
            TokenNftInfo tokenNftInfo = txResponse[0];

            return new NftInfoResponse
            {
                NftId = tokenNftInfo.NftId.ToString(),
                AccountId = tokenNftInfo.AccountId.ToString(),
                CreationTime = tokenNftInfo.CreationTime.ToUnixTimeSeconds().ToString(),
                Metadata = Hex.ToHexString(tokenNftInfo.Metadata),
                LedgerId = tokenNftInfo.LedgerId.ToString(),
                SpenderId = tokenNftInfo.SpenderId.ToString()
            };
        }
    }
}