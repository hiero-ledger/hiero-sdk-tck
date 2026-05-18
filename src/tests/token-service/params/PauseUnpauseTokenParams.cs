// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class PauseUnpauseTokenParams : Parameters
    {
        public PauseUnpauseTokenParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TokenId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}