// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;
using System;
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ScheduleService.Params
{
    public class ScheduleCreateParams : Parameters
    {
        public ScheduleCreateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            Transaction = parameters["scheduledTransaction"] is Dictionary<string, object> scheduledTransactionData
                ? new ScheduledTransaction(scheduledTransactionData)
                : null;

            Memo = parameters["memo"] as string;
            AdminKey = parameters["adminKey"] as string;
            PayerAccountId = parameters["payerAccountId"] as string;
            ExpirationTime = parameters["expirationTime"] as string;
            WaitForExpiry = parameters["waitForExpiry"] as bool?;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public ScheduledTransaction? Transaction { get; private set; }
        public string? Memo { get; private set; }
        public string? AdminKey { get; private set; }
        public string? PayerAccountId { get; private set; }
        public string? ExpirationTime { get; private set; }
        public bool? WaitForExpiry { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }

        public class ScheduledTransaction(Dictionary<string, object> data)
        {
            public string? Method { get; private set; } = data["method"] as string;
            public Dictionary<string, object>? Params { get; private set; } = data["params"] as Dictionary<string, object>;
        }
    }
}