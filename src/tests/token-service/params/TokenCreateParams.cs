// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using Hiero.SDK.Fee;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenCreateParams : Parameters
    {
        public TokenCreateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            Name = parameters["name"] as string;
            Symbol = parameters["symbol"] as string;
            Decimals = parameters["decimals"] as long?;
            InitialSupply = parameters["initialSupply"] as string;
            TreasuryAccountId = parameters["treasuryAccountId"] as string;
            AdminKey = parameters["adminKey"] as string;
            KycKey = parameters["kycKey"] as string;
            FreezeKey = parameters["freezeKey"] as string;
            WipeKey = parameters["wipeKey"] as string;
            SupplyKey = parameters["supplyKey"] as string;
            FeeScheduleKey = parameters["feeScheduleKey"] as string;
            PauseKey = parameters["pauseKey"] as string;
            MetadataKey = parameters["metadataKey"] as string;
            FreezeDefault = parameters["freezeDefault"] as bool?;
            ExpirationTime = parameters["expirationTime"] as string;
            AutoRenewAccountId = parameters["autoRenewAccountId"] as string;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            Memo = parameters["memo"] as string;
            TokenType = parameters["tokenType"] as string;
            SupplyType = parameters["supplyType"] as string;
            MaxSupply = parameters["maxSupply"] as string;
            Metadata = parameters["metadata"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
            CustomFees = JSONRPCParamParser.ParseCustomFees(parameters);
        }

        public string? Name { get; private set; }
        public string? Symbol { get; private set; }
        public long? Decimals { get; private set; }
        public string? InitialSupply { get; private set; }
        public string? TreasuryAccountId { get; private set; }
        public string? AdminKey { get; private set; }
        public string? KycKey { get; private set; }
        public string? FreezeKey { get; private set; }
        public string? WipeKey { get; private set; }
        public string? SupplyKey { get; private set; }
        public string? FeeScheduleKey { get; private set; }
        public string? PauseKey { get; private set; }
        public string? MetadataKey { get; private set; }
        public bool? FreezeDefault { get; private set; }
        public string? ExpirationTime { get; private set; }
        public string? AutoRenewAccountId { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? Memo { get; private set; }
        public string? TokenType { get; private set; }
        public string? SupplyType { get; private set; }
        public string? MaxSupply { get; private set; }
        public IList<CustomFee>? CustomFees { get; private set; }
        public string? Metadata { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}