// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Params
{
    /// <summary>
    /// UpdateContractParams for contract update method
    /// </summary>
    public class UpdateContractParams : Parameters
    {
        public UpdateContractParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ContractId = parameters["contractId"] as string;
            AdminKey = parameters["adminKey"] as string;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            AutoRenewAccountId = parameters["autoRenewAccountId"] as string;
            StakedAccountId = parameters["stakedAccountId"] as string;
            StakedNodeId = parameters["stakedNodeId"] as string;
            DeclineStakingReward = parameters["declineStakingReward"] is bool b && b;
            Memo = parameters["memo"] as string;
            MaxAutomaticTokenAssociations = parameters["maxAutomaticTokenAssociations"] is long m ? m : 0;
            ExpirationTime = parameters["expirationTime"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? ContractId { get; private set; }
        public string? AdminKey { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? AutoRenewAccountId { get; private set; }
        public string? StakedAccountId { get; private set; }
        public string? StakedNodeId { get; private set; }
        public bool? DeclineStakingReward { get; private set; }
        public string? Memo { get; private set; }
        public long? MaxAutomaticTokenAssociations { get; private set; }
        public string? ExpirationTime { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}