// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Contract;
using Hiero.TCK.Tests.ContractService.Responses;

namespace Hiero.TCK.Tests.ContractService
{
    public partial class TestContract(SdkService sdkService) : ContractService(sdkService)
    {
        private static ContractResponse.ContractInfoQueryResponse MapContractInfo(ContractInfo result)
        {
            return new ContractResponse.ContractInfoQueryResponse
            {
                ContractId = result.ContractId?.ToString(),
                AccountId = result.AccountId?.ToString(),
                ContractAccountId = result.ContractAccountId,
                AdminKey = result.AdminKey?.ToString(),
                ExpirationTime = result.ExpirationTime.ToUnixTimeSeconds().ToString(),
                AutoRenewPeriod = result.AutoRenewPeriod.TotalSeconds.ToString(),
                AutoRenewAccountId = result.AutoRenewAccountId?.ToString(),
                Storage = result.Storage.ToString(),
                ContractMemo = result.ContractMemo,
                Balance = result.Balance?.ToString(),
                IsDeleted = result.IsDeleted,
                MaxAutomaticTokenAssociations = "0",
                LedgerId = result.LedgerId?.ToString(),
                StakingInfo = MapStakingInfo(result.StakingInfo)
            };
        }
        private static ContractResponse.ContractInfoQueryResponse.StakingInfoResponse MapStakingInfo(StakingInfo stakingInfo)
        {
            return new ContractResponse.ContractInfoQueryResponse.StakingInfoResponse
            {
                DeclineStakingReward = stakingInfo.DeclineStakingReward,
                StakePeriodStart = stakingInfo.StakePeriodStart.ToUnixTimeSeconds().ToString(),
                PendingReward = stakingInfo.PendingReward?.ToString(),
                StakedToMe = stakingInfo.StakedToMe?.ToString(),
                StakedAccountId = stakingInfo.StakedAccountId?.ToString(),
                StakedNodeId = stakingInfo.StakedNodeId?.ToString()
            };
        }
    }
}