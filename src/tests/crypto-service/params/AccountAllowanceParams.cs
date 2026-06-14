// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class AccountAllowanceParams : Parameters
    {
        public AccountAllowanceParams(Dictionary<string, object> parameters) : base(parameters)
        {
            Allowances = JSONRPCParamParser.ParseAllowances(parameters);
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public IList<AllowanceParams>? Allowances { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}