// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TopicService.Params
{
    public class UpdateTopicParams : Parameters
    {
        public UpdateTopicParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TopicId = parameters["topicId"] as string;
            Memo = parameters["memo"] as string;
            AdminKey = parameters["adminKey"] as string;
            SubmitKey = parameters["submitKey"] as string;
            FeeScheduleKey = parameters["feeScheduleKey"] as string;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            AutoRenewAccountId = parameters["autoRenewAccountId"] as string;
            ExpirationTime = parameters["expirationTime"] as string;
            FeeExemptKeys = parameters["feeExemptKey"] as IList<string>;
            CustomFees = JSONRPCParamParser.ParseCustomFees(parameters);
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TopicId { get; private set; }
        public string? Memo { get; private set; }
        public string? AdminKey { get; private set; }
        public string? SubmitKey { get; private set; }
        public string? FeeScheduleKey { get; private set; }
        public IList<string>? FeeExemptKeys { get; private set; }
        public IList<CustomFee>? CustomFees { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? AutoRenewAccountId { get; private set; }
        public string? ExpirationTime { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}