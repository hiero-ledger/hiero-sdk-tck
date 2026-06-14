// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ScheduleService.Params
{
    public class ScheduleInfoParams : Parameters
    {
        public ScheduleInfoParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ScheduleId = parameters["scheduleId"] as string;
            QueryPayment = parameters["queryPayment"] as string;
            MaxQueryPayment = parameters["maxQueryPayment"] as string;
            GetCost = parameters["getCost"] as bool?;
        }

        public string? ScheduleId { get; private set; }
        public string? QueryPayment { get; private set; }
        public string? MaxQueryPayment { get; private set; }
        public bool? GetCost { get; private set; }
    }
}