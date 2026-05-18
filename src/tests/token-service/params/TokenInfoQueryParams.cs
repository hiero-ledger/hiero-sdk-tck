// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenInfoQueryParams : Parameters
    {
        public TokenInfoQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
        }

        public string? TokenId { get; private set; }
    }
}