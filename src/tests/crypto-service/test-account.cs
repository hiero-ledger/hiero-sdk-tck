// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;
using System.Linq;

using Hiero.SDK;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Token;
using Hiero.SDK.Nfts;
using Hiero.SDK.LiveHashes;
using Hiero.TCK.Tests.CryptoService.Responses;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestAccount(SdkService sdkService) : CryptoService(sdkService)
    {
        private static GetAccountInfoResponse MapAccountInfoResponse(AccountInfo info)
        {
            return new GetAccountInfoResponse(
                info.AccountId?.ToString() ?? "",
                info.ContractAccountId,
                info.IsDeleted,
                info.ProxyAccountId?.ToString() ?? null,
                info.ProxyReceived?.ToTinybars().ToString() ?? "0",
                info.Key?.ToString() ?? null,
                info.Balance?.ToTinybars().ToString() ?? "0",
                info.SendRecordThreshold?.ToTinybars().ToString() ?? "0",
                info.ReceiveRecordThreshold?.ToTinybars().ToString() ?? "0",
                info.IsReceiverSigRequired,
                info.ExpirationTime.ToString() ?? "",
                info.AutoRenewPeriod.TotalSeconds.ToString() ?? "0",
                MapLiveHashes(info.LiveHashes),
                MapTokenRelationships(info.TokenRelationships),
                info.AccountMemo,
                info.OwnedNfts.ToString(),
                info.MaxAutomaticTokenAssociations.ToString(),
                info.AliasKey?.ToString() ?? null,
                info.LedgerId?.ToString() ?? null,
                MapHbarAllowances(info.HbarAllowances),
                MapTokenAllowances(info.TokenAllowances),
                MapNftAllowances(info.TokenNftAllowances),
                info.EthereumNonce.ToString());
        }
        private static GetAccountInfoResponse.StakingInfoResponse MapStakingInfo(StakingInfo info)
        {
            return new GetAccountInfoResponse.StakingInfoResponse(
                info.DeclineStakingReward,
                info.StakePeriodStart.ToString() ?? null,
                info.PendingReward?.ToTinybars().ToString() ?? null,
                info.StakedToMe?.ToTinybars().ToString() ?? null,
                info.StakedAccountId?.ToString() ?? null,
                info.StakedNodeId?.ToString() ?? null);
        }

        private static List<GetAccountInfoResponse.LiveHashResponse> MapLiveHashes(IList<LiveHash> liveHashes)
        {
            if (liveHashes == null) return [];

            return [.. liveHashes.Select(lh => new GetAccountInfoResponse.LiveHashResponse(
                lh.AccountId?.ToString() ?? "",
                Convert.ToBase64String(lh.Hash.ToByteArray()),
                [.. lh.Keys.Select(key => key.ToString() ?? throw new ArgumentException("Key could not be determined"))],
                lh.Duration.TotalSeconds.ToString() ?? "0"
            )) ];
        }
        private static List<GetAccountInfoResponse.HbarAllowanceResponse> MapHbarAllowances(IList<HbarAllowance> allowances)
        {
            if (allowances == null) return [];

            return [.. allowances.Select(a => new GetAccountInfoResponse.HbarAllowanceResponse(
                a.OwnerAccountId?.ToString() ?? null,
                a.SpenderAccountId?.ToString() ?? null,
                a.Amount?.ToTinybars().ToString() ?? null
            ))];
        }
        private static List<GetAccountInfoResponse.TokenAllowanceResponse> MapTokenAllowances(IList<TokenAllowance> allowances)
        {
            if (allowances == null) return [];

            return [ ..allowances.Select(a => new GetAccountInfoResponse.TokenAllowanceResponse(
                a.TokenId?.ToString() ?? null,
                a.OwnerAccountId?.ToString() ?? null,
                a.SpenderAccountId?.ToString() ?? null,
                a.Amount.ToString()
            )) ];
        }
        private static List<GetAccountInfoResponse.TokenNftAllowanceResponse> MapNftAllowances(IList<TokenNftAllowance> allowances)
        {
            if (allowances == null) return [];

            return [.. allowances.Select(a => new GetAccountInfoResponse.TokenNftAllowanceResponse(
                a.TokenId?.ToString() ?? null,
                a.OwnerAccountId?.ToString() ?? null,
                a.SpenderAccountId?.ToString() ?? null,
                a.SerialNumbers?.Select(s => s.ToString()).ToList() ?? null,
                a.AllSerials ?? false,
                a.DelegatingSpender?.ToString() ?? null
            ))];
        }
        private static Dictionary<string, GetAccountInfoResponse.TokenRelationshipInfo> MapTokenRelationships(Dictionary<TokenId, TokenRelationship> rels)
        {
            var result = new Dictionary<string, GetAccountInfoResponse.TokenRelationshipInfo>();
            if (rels == null) return result;

            foreach (var entry in rels)
            {
                var tr = entry.Value;
                result[entry.Key.ToString()] = new GetAccountInfoResponse.TokenRelationshipInfo(
                    tr.TokenId?.ToString() ?? "",
                    tr.Symbol,
                    tr.Balance.ToString(),
                    tr.KycStatus,
                    tr.FreezeStatus,
                    tr.AutomaticAssociation);
            }

            return result;
        }        
    }
}