// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class GrantRevokeTokenKycParams : Parameters
    {
        public GrantRevokeTokenKycParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
            AccountId = parameters["accountId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TokenId { get; private set; }
        public string? AccountId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}