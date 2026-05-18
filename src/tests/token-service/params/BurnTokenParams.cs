// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class BurnTokenParams : Parameters
    {
        public BurnTokenParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
            Amount = parameters["amount"] as string;
            Metadata = parameters["metadata"] as IList<string>;
            SerialNumbers = parameters["serialNumbers"] as IList<string>;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TokenId { get; private set; }
        public string? Amount { get; private set; }
        public IList<string>? Metadata { get; private set; }
        public IList<string>? SerialNumbers { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}