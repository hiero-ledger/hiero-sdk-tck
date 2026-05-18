// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.ContractService.Responses
{
    public class ContractResponse(string? contractId, ResponseStatus? status)
    {
        public string? ContractId { get; init; } = contractId;
        public ResponseStatus? Status { get; init; } = status;

        public class ContractInfoQueryResponse
        {
            public string? ContractId { get; init; }
            public string? AccountId { get; init; }
            public string? ContractAccountId { get; init; }
            public string? AdminKey { get; init; }
            public string? ExpirationTime { get; init; }
            public string? AutoRenewPeriod { get; init; }
            public string? AutoRenewAccountId { get; init; }
            public string? Storage { get; init; }
            public string? ContractMemo { get; init; }
            public string? Balance { get; init; }
            public bool? IsDeleted { get; init; }
            public string? MaxAutomaticTokenAssociations { get; init; }
            public string? LedgerId { get; init; }
            public StakingInfoResponse? StakingInfo { get; init; }

            public class StakingInfoResponse
            {
                public bool? DeclineStakingReward { get; init; }
                public string? StakePeriodStart { get; init; }
                public string? PendingReward { get; init; }
                public string? StakedToMe { get; init; }
                public string? StakedAccountId { get; init; }
                public string? StakedNodeId { get; init; }
            }
        }
    }
}