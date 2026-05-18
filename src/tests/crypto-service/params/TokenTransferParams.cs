// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class TokenTransferParams(Dictionary<string, object> jrpcParams)
    {
        public string? AccountId { get; } = jrpcParams["accountId"] as string;
        public string? TokenId { get; } = jrpcParams["tokenId"] as string;
        public string? Amount { get; } = jrpcParams["amount"] as string;
        public long? Decimals { get; } = jrpcParams["decimals"] as long?;
    }
}