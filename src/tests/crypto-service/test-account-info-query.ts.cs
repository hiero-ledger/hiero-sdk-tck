// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Cryptocurrency;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Tests.CryptoService.Params;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount 
    {
        public virtual GetAccountInfoResponse GetAccountInfo(GetAccountInfoParams @params)
        {
            var client = sdkService.GetClient(@params.SessionId);
            var query = new AccountInfoQuery();
            
            if (!string.IsNullOrEmpty(@params.AccountId))
                query.AccountId = AccountId.FromString(@params.AccountId);

            var accountInfo = query.Execute(client);

            return MapAccountInfoResponse(accountInfo);
        }
    }
}