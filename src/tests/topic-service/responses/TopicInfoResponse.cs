// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.TopicService.Responses
{
    public class TopicInfoResponse(
        string? topicId,
        string? topicMemo,
        string? sequenceNumber,
        string? runningHash,
        string? adminKey,
        string? submitKey,
        string? autoRenewAccountId,
        string? autoRenewPeriod,
        string? expirationTime,
        string? feeScheduleKey,
        IList<string>? feeExemptKeys,
        IList<TopicInfoResponse.CustomFeeResponse>? customFees,
        string? ledgerId)
    {
        public string? TopicId { get; } = topicId;
        public string? TopicMemo { get; } = topicMemo;
        public string? SequenceNumber { get; } = sequenceNumber;
        public string? RunningHash { get; } = runningHash;
        public string? AdminKey { get; } = adminKey;
        public string? SubmitKey { get; } = submitKey;
        public string? AutoRenewAccountId { get; } = autoRenewAccountId;
        public string? AutoRenewPeriod { get; } = autoRenewPeriod;
        public string? ExpirationTime { get; } = expirationTime;
        public string? FeeScheduleKey { get; } = feeScheduleKey;
        public IList<string>? FeeExemptKeys { get; } = feeExemptKeys;
        public IList<CustomFeeResponse>? CustomFees { get; } = customFees;
        public string? LedgerId { get; } = ledgerId;

        public class CustomFeeResponse(string? feeCollectorAccountId, bool? allCollectorsAreExempt, FixedFeeResponse? fixedFee)
        {
            public string? FeeCollectorAccountId { get; } = feeCollectorAccountId;
            public bool? AllCollectorsAreExempt { get; } = allCollectorsAreExempt;
            public FixedFeeResponse? FixedFee { get; } = fixedFee;
        }

        public class FixedFeeResponse(string? amount, string? denominatingTokenId)
        {
            public string? Amount { get; } = amount;
            public string? DenominatingTokenId { get; } = denominatingTokenId;
        }
    }
}