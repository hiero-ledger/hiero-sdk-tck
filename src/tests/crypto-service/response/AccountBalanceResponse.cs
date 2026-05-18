// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Token;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Responses
{
    public class AccountBalanceResponse(
        string? hbars,
        Dictionary<TokenId, ulong>? tokenBalances,
        Dictionary<TokenId, uint>? tokenDecimals)
    {
        public string? Hbars { get; init; } = hbars;
        public Dictionary<TokenId, ulong>? TokenBalances { get; init; } = tokenBalances;
        public Dictionary<TokenId, uint>? TokenDecimals { get; init; } = tokenDecimals;
    }
}