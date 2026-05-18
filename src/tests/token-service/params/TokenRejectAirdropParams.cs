// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenRejectAirdropParams : Parameters
    {
        public TokenRejectAirdropParams(Dictionary<string, object> parameters) : base(parameters)
        {
            OwnerAccountId = parameters["ownerId"] as string;
            TokenIds = parameters["tokenIds"] as IList<string>;
            SerialNumbers = parameters["serialNumbers"] as IList<string>;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? OwnerAccountId { get; private set; }
        public IList<string>? TokenIds { get; private set; }
        public IList<string>? SerialNumbers { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}