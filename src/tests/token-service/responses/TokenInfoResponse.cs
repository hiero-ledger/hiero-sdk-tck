// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Fee;
using Hiero.SDK.Token;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Responses
{
    public class TokenInfoResponse
    {
        public required string TokenId { get; set; }
        public required string Name { get; set; }
        public required string Symbol { get; set; }
        public required int Decimals { get; set; }
        public required string TotalSupply { get; set; }
        public required string TreasuryAccountId { get; set; }
        public required string AdminKey { get; set; }
        public required string KycKey { get; set; }
        public required string FreezeKey { get; set; }
        public required string WipeKey { get; set; }
        public required string SupplyKey { get; set; }
        public required string FeeScheduleKey { get; set; }
        public required bool DefaultFreezeStatus { get; set; }
        public required bool DefaultKycStatus { get; set; }
        public required bool IsDeleted { get; set; }
        public required string AutoRenewAccountId { get; set; }
        public required string AutoRenewPeriod { get; set; }
        public required string ExpirationTime { get; set; }
        public required string TokenMemo { get; set; }
        public required IList<CustomFee> CustomFees { get; set; }
        public required TokenType TokenType { get; set; }
        public required TokenSupplyType SupplyType { get; set; }
        public required string MaxSupply { get; set; }
        public required string PauseKey { get; set; }
        public required bool PauseStatus { get; set; }
        public required string Metadata { get; set; }
        public required string MetadataKey { get; set; }
        public required string LedgerId { get; set; }
    }
}