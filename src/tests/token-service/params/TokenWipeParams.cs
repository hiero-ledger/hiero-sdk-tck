// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    /// <summary>
    /// WipeTokenParams for token wipe method
    /// </summary>
    public class TokenWipeParams : Parameters
    {
        public TokenWipeParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
            AccountId = parameters["accountId"] as string;
            Amount = parameters["amount"] as string;
            SerialNumbers = parameters["serialNumbers"] as IList<string>;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TokenId { get; private set; }
        public string? AccountId { get; private set; }
        public string? Amount { get; private set; }
        public IList<string>? SerialNumbers { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}