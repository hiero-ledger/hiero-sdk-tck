// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class AccountDeleteParams : Parameters
    {
        public AccountDeleteParams(Dictionary<string, object> parameters) : base(parameters)
        {
            DeleteAccountId = parameters["deleteAccountId"] as string;
            TransferAccountId = parameters["transferAccountId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? DeleteAccountId { get; private set; }
        public string? TransferAccountId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}