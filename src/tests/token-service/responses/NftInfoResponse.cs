// SPDX-License-Identifier: Apache-2.0

namespace Hiero.TCK.Tests.TokenService.Responses
{
    public class NftInfoResponse
    {
        public required string NftId { get; set; }
        public required string AccountId { get; set; }
        public required string CreationTime { get; set; }
        public required string Metadata { get; set; }
        public required string LedgerId { get; set; }
        public required string SpenderId { get; set; }
    }
}