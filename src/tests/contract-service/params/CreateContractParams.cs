// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using Hiero.SDK.Fee;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Params
{
    /// <summary>
    /// CreateContractParams for contract create method
    /// </summary>
    public class CreateContractParams : Parameters
    {
        public CreateContractParams(Dictionary<string, object> parameters) : base(parameters)
        {
            AdminKey = parameters["adminKey"] as string;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            AutoRenewAccountId = parameters["autoRenewAccountId"] as string;
            InitialBalance = parameters["initialBalance"] as string;
            BytecodeFileId = parameters["bytecodeFileId"] as string;
            Initcode = parameters["initcode"] as string;
            StakedAccountId = parameters["stakedAccountId"] as string;
            StakedNodeId = parameters["stakedNodeId"] as string;
            Gas = parameters["gas"] as string;
            DeclineStakingReward = parameters["declineStakingReward"] is bool b && b;
            Memo = parameters["memo"] as string;
            MaxAutomaticTokenAssociations = parameters["maxAutomaticTokenAssociations"] is long m ? m : 0;
            ConstructorParameters = parameters["constructorParameters"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? AdminKey { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? AutoRenewAccountId { get; private set; }
        public string? InitialBalance { get; private set; }
        public string? BytecodeFileId { get; private set; }
        public string? Initcode { get; private set; }
        public string? StakedAccountId { get; private set; }
        public string? StakedNodeId { get; private set; }
        public string? Gas { get; private set; }
        public bool? DeclineStakingReward { get; private set; }
        public string? Memo { get; private set; }
        public long? MaxAutomaticTokenAssociations { get; private set; }
        public string? ConstructorParameters { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}