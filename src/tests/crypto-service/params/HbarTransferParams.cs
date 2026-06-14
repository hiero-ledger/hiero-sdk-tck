// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class HbarTransferParams
    {
        public string? AccountId { get; init; }
        public string? EvmAddress { get; init; }
        public string? Amount { get; init; }

        public HbarTransferParams(Dictionary<string, object> jrpcParams)
        {
            AccountId = jrpcParams["accountId"] as string;
            EvmAddress = jrpcParams["evmAddress"] as string;
            Amount = jrpcParams["amount"] as string;

            if ((AccountId is not null && EvmAddress is not null) || (AccountId is null && EvmAddress is null))
                throw new ArgumentException("invalid parameters: only one of accountId or evmAddress SHALL be provided.");
        }
    }
}