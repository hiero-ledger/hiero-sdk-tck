// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.CryptoService.Params;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount 
    {
        public virtual AccountBalanceResponse AccountBalanceQuery(AccountBalanceQueryParams @params)
        {
            var query = QueryBuilders.AccountBuilder.BuildAccountBalanceQuery(@params);
            var client = sdkService.GetClient(@params.SessionId);
            var result = query.Execute(client);

            return new AccountBalanceResponse(result.Hbars.ToString().Replace(" tℏ", ""), result.Tokens, result.TokenDecimals);
        }
    }
}