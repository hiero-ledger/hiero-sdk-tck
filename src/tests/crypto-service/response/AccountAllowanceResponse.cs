// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.CryptoService.Responses
{
    public class AccountAllowanceResponse(ResponseStatus? status)
    {
        public ResponseStatus? Status { get; init; } = status;
    }
}