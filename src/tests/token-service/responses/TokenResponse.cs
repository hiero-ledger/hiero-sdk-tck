// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.TokenService.Responses
{
    public class TokenResponse(string? tokenId, ResponseStatus status)
    {
        public string? TokenId { get; set; } = tokenId;
        public ResponseStatus Status { get; set; } = status;
    }
}