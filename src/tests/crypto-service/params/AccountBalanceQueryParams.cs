// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class AccountBalanceQueryParams : Parameters
    {
        public AccountBalanceQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            AccountId = parameters["accountId"] as string;
            ContractId = parameters["contractId"] as string;
        }

        public string? AccountId { get; private set; }
        public string? ContractId { get; private set; }
    }
}