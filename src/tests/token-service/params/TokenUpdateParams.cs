// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenUpdateParams : Parameters
    {
        public TokenUpdateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
            Name = parameters["name"] as string;
            Symbol = parameters["symbol"] as string;
            TreasuryAccountId = parameters["treasuryAccountId"] as string;
            AdminKey = parameters["adminKey"] as string;
            KycKey = parameters["kycKey"] as string;
            FreezeKey = parameters["freezeKey"] as string;
            WipeKey = parameters["wipeKey"] as string;
            SupplyKey = parameters["supplyKey"] as string;
            FeeScheduleKey = parameters["feeScheduleKey"] as string;
            PauseKey = parameters["pauseKey"] as string;
            MetadataKey = parameters["metadataKey"] as string;
            ExpirationTime = parameters["expirationTime"] as string;
            AutoRenewAccountId = parameters["autoRenewAccountId"] as string;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            Memo = parameters["memo"] as string;
            Metadata = parameters["metadata"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TokenId { get; private set; }
        public string? Name { get; private set; }
        public string? Symbol { get; private set; }
        public string? TreasuryAccountId { get; private set; }
        public string? AdminKey { get; private set; }
        public string? KycKey { get; private set; }
        public string? FreezeKey { get; private set; }
        public string? WipeKey { get; private set; }
        public string? SupplyKey { get; private set; }
        public string? FeeScheduleKey { get; private set; }
        public string? PauseKey { get; private set; }
        public string? MetadataKey { get; private set; }
        public string? ExpirationTime { get; private set; }
        public string? AutoRenewAccountId { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? Memo { get; private set; }
        public string? Metadata { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}