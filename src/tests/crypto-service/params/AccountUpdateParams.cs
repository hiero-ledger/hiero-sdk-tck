// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class AccountUpdateParams : Parameters
    {
        public AccountUpdateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            Key = parameters["key"] as string;
            ReceiverSignatureRequired = parameters["receiverSignatureRequired"] as bool?;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            Memo = parameters["memo"] as string;
            MaxAutoTokenAssociations = parameters["maxAutoTokenAssociations"] as long?;
            StakedAccountId = parameters["stakedAccountId"] as string;
            AccountId = parameters["accountId"] as string;
            StakedNodeId = parameters["stakedNodeId"] as string;
            ExpirationTime = parameters["expirationTime"] as string;
            DeclineStakingReward = parameters["declineStakingReward"] as bool?;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? Key { get; private set; }
        public bool? ReceiverSignatureRequired { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? Memo { get; private set; }
        public string? ExpirationTime { get; private set; }
        public long? MaxAutoTokenAssociations { get; private set; }
        public string? StakedAccountId { get; private set; }
        public string? AccountId { get; private set; }
        public string? StakedNodeId { get; private set; }
        public bool? DeclineStakingReward { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}