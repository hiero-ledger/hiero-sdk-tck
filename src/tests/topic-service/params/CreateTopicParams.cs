// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using Hiero.SDK.Fee;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TopicService.Params
{
    public class CreateTopicParams : Parameters
    {
        public CreateTopicParams(Dictionary<string, object> parameters) : base(parameters)
        {
            Memo = parameters["memo"] as string;
            AdminKey = parameters["adminKey"] as string;
            SubmitKey = parameters["submitKey"] as string;
            AutoRenewPeriod = parameters["autoRenewPeriod"] as string;
            AutoRenewAccountId = parameters["autoRenewAccountId"] as string;
            FeeScheduleKey = parameters["feeScheduleKey"] as string;
            FeeExemptKeys = parameters["feeExemptKeys"] as IList<string>;
            CustomFees = JSONRPCParamParser.ParseCustomFees(parameters);
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? Memo { get; private set; }
        public string? AdminKey { get; private set; }
        public string? SubmitKey { get; private set; }
        public string? AutoRenewPeriod { get; private set; }
        public string? AutoRenewAccountId { get; private set; }
        public string? FeeScheduleKey { get; private set; }
        public IList<string>? FeeExemptKeys { get; private set; }
        public IList<CustomFee>? CustomFees { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}