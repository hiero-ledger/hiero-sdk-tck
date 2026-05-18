// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.CryptoService.Responses
{
    public class AccountResponse(string? accountId, ResponseStatus? status)
    {
        public string? AccountId { get; init; } = accountId;
        public ResponseStatus? Status { get; init; } = status;
    }
}