// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Responses
{
    public class TokenMintResponse : TokenResponse
    {
        public TokenMintResponse(string? tokenId, ResponseStatus status, string newTotalSupply, List<string> serialNumbers) : base(tokenId, status)
        {
            NewTotalSupply = newTotalSupply;
            SerialNumbers = serialNumbers;
        }

        public string NewTotalSupply { get; init; }
        public IList<string> SerialNumbers { get; init; }
    }
}