// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.ScheduleService.Params
{
    public class ScheduleDeleteParams : Parameters
    {
        public ScheduleDeleteParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ScheduleId = parameters["scheduleId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? ScheduleId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}