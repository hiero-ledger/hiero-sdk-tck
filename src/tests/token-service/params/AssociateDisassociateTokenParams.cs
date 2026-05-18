// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class AssociateDisassociateTokenParams : Parameters
    {
        public AssociateDisassociateTokenParams(Dictionary<string, object> parameters) : base(parameters)
        {
            AccountId = parameters["accountId"] as string;
            TokenIds = parameters["tokenIds"] as IList<string>;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? AccountId { get; private set; }
        public IList<string>? TokenIds { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}