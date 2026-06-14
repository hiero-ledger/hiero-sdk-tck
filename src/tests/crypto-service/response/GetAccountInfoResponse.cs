// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Responses
{
    public class GetAccountInfoResponse(
        string? accountId,
        string? contractAccountId,
        bool? isDeleted,
        string? proxyAccountId,
        string? proxyReceived,
        string? key,
        string? balance,
        string? sendRecordThreshold,
        string? receiveRecordThreshold,
        bool? isReceiverSignatureRequired,
        string? expirationTime,
        string? autoRenewPeriod,
        IList<GetAccountInfoResponse.LiveHashResponse>? liveHashes,
        Dictionary<string, GetAccountInfoResponse.TokenRelationshipInfo>? tokenRelationships,
        string? accountMemo,
        string? ownedNfts,
        string? maxAutomaticTokenAssociations,
        string? aliasKey,
        string? ledgerId,
        IList<GetAccountInfoResponse.HbarAllowanceResponse>? hbarAllowances,
        IList<GetAccountInfoResponse.TokenAllowanceResponse>? tokenAllowances,
        IList<GetAccountInfoResponse.TokenNftAllowanceResponse>? nftAllowances,
        string? ethereumNonce)
    {
        public string? AccountId { get; set; } = accountId;
        public string? ContractAccountId { get; set; } = contractAccountId;
        public bool? IsDeleted { get; set; } = isDeleted;
        public string? ProxyAccountId { get; set; } = proxyAccountId;
        public string? ProxyReceived { get; set; } = proxyReceived;
        public string? Key { get; set; } = key;
        public string? Balance { get; set; } = balance;
        public string? SendRecordThreshold { get; set; } = sendRecordThreshold;
        public string? ReceiveRecordThreshold { get; set; } = receiveRecordThreshold;
        public bool? IsReceiverSignatureRequired { get; set; } = isReceiverSignatureRequired;
        public string? ExpirationTime { get; set; } = expirationTime;
        public string? AutoRenewPeriod { get; set; } = autoRenewPeriod;
        public IList<LiveHashResponse>? LiveHashes { get; set; } = liveHashes;
        public Dictionary<string, TokenRelationshipInfo>? TokenRelationships { get; set; } = tokenRelationships;
        public string? AccountMemo { get; set; } = accountMemo;
        public string? OwnedNfts { get; set; } = ownedNfts;
        public string? MaxAutomaticTokenAssociations { get; set; } = maxAutomaticTokenAssociations;
        public string? AliasKey { get; set; } = aliasKey;
        public string? LedgerId { get; set; } = ledgerId;
        public IList<HbarAllowanceResponse>? HbarAllowances { get; set; } = hbarAllowances;
        public IList<TokenAllowanceResponse>? TokenAllowances { get; set; } = tokenAllowances;
        public IList<TokenNftAllowanceResponse>? NftAllowances { get; set; } = nftAllowances;
        public string? EthereumNonce { get; set; } = ethereumNonce;

        public class LiveHashResponse(
            string? accountId,
            string? hash,
            IList<string>? keys,
            string? duration)
        {
            public string? AccountId { get; set; } = accountId;
            public string? Hash { get; set; } = hash;
            public IList<string>? Keys { get; set; } = keys;
            public string? Duration { get; set; } = duration;
        }
        public class TokenRelationshipInfo(
            string? tokenId,
            string? symbol,
            string? balance,
            bool isKycGranted,
            bool isFrozen,
            bool automaticAssociation)
        {
            public string? TokenId { get; set; } = tokenId;
            public string? Symbol { get; set; } = symbol;
            public string? Balance { get; set; } = balance;
            public bool IsKycGranted { get; set; } = isKycGranted;
            public bool IsFrozen { get; set; } = isFrozen;
            public bool AutomaticAssociation { get; set; } = automaticAssociation;
        }
        public class HbarAllowanceResponse(
            string? ownerAccountId,
            string? spenderAccountId,
            string? amount)
        {
            public string? OwnerAccountId { get; set; } = ownerAccountId;
            public string? SpenderAccountId { get; set; } = spenderAccountId;
            public string? Amount { get; set; } = amount;
        }
        public class TokenAllowanceResponse(
            string? tokenId,
            string? ownerAccountId,
            string? spenderAccountId,
            string? amount)
        {
            public string? TokenId { get; set; } = tokenId;
            public string? OwnerAccountId { get; set; } = ownerAccountId;
            public string? SpenderAccountId { get; set; } = spenderAccountId;
            public string? Amount { get; set; } = amount;
        }
        public class TokenNftAllowanceResponse(
            string? tokenId,
            string? ownerAccountId,
            string? spenderAccountId,
            IList<string>? serialNumbers,
            bool allSerials,
            string? delegatingSpender)
        {
            public string? TokenId { get; set; } = tokenId;
            public string? OwnerAccountId { get; set; } = ownerAccountId;
            public string? SpenderAccountId { get; set; } = spenderAccountId;
            public IList<string>? SerialNumbers { get; set; } = serialNumbers;
            public bool AllSerials { get; set; } = allSerials;
            public string? DelegatingSpender { get; set; } = delegatingSpender;
        }
        public class StakingInfoResponse(
            bool declineStakingReward,
            string? stakePeriodStart, 
            string? pendingReward,
            string? stakedToMe, 
            string? stakedAccountId, 
            string? stakedNodeId)
        {
            public bool DeclineStakingReward { get; set; } = declineStakingReward;
            public string? StakePeriodStart { get; set; } = stakePeriodStart;
            public string? PendingReward { get; set; } = pendingReward;
            public string? StakedToMe { get; set; } = stakedToMe;
            public string? StakedAccountId { get; set; } = stakedAccountId;
            public string? StakedNodeId { get; set; } = stakedNodeId;
        }
    }
}