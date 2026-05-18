// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Consensus;
using Hiero.SDK.Fee;
using Hiero.TCK.Tests.TopicService.Responses;

using System;
using System.Linq;

namespace Hiero.TCK.Tests.TopicService
{
    public class TopicService : Service
    {
        private static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(3);
        private readonly SdkService sdkService;
        
        public TopicService(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }

        protected TopicInfoResponse MapTopicInfoResponse(TopicInfo topicInfo)
        {
            return new TopicInfoResponse(
                topicInfo.TopicId.ToString(), 
                topicInfo.TopicMemo, 
                topicInfo.SequenceNumber.ToString(),
                topicInfo.RunningHash.ToString(), 
                topicInfo.AdminKey?.ToString(), 
                topicInfo.SubmitKey?.ToString(), 
                topicInfo.AutoRenewAccountId?.ToString(),
                topicInfo.AutoRenewPeriod.Seconds.ToString(), 
                topicInfo.ExpirationTime.ToUnixTimeSeconds().ToString(),
                topicInfo.FeeScheduleKey?.ToString(),
                [.. topicInfo.FeeExemptKeys.Select(key => key.ToString() ?? string.Empty)],
                topicInfo.CustomFees?.Select(MapToCustomFeeResponse).ToList(), 
                topicInfo.LedgerId.ToString());
        }
        private TopicInfoResponse.CustomFeeResponse MapToCustomFeeResponse(CustomFixedFee fee)
        {
            TopicInfoResponse.FixedFeeResponse fixedFee = new (fee.Amount.ToString(), fee.DenominatingTokenId?.ToString());

            return new TopicInfoResponse.CustomFeeResponse(fee.FeeCollectorAccountId?.ToString(), fee.AllCollectorsAreExempt, fixedFee);
        }
    }
}