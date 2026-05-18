// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class FreezeUnfreezeTokenParams : Parameters
    {
        public FreezeUnfreezeTokenParams(Dictionary<string, object> parameters) : base(parameters)
        {
            AccountId = parameters["accountId"] as string;
            TokenId = parameters["tokenId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? AccountId { get; private set; }
        public string? TokenId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}