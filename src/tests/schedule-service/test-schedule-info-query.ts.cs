// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Schedule;
using Hiero.TCK.Tests.ScheduleService.Params;
using Hiero.TCK.Tests.ScheduleService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.ScheduleService
{
    public partial class TestSchedule
    {
        public virtual ScheduleInfoResponse GetScheduleInfo(ScheduleInfoParams @params)
        {
            ScheduleInfoQuery query = QueryBuilders.ScheduleBuilder.BuildScheduleInfoQuery(@params);
            
            Client client = sdkService.GetClient(@params.SessionId);

            if (@params.GetCost is not null)
            {
                Hbar cost = query.GetCost(client);

                return new ScheduleInfoResponse { Cost = cost.ToTinybars().ToString() };
            }

            ScheduleInfo result = query.Execute(client);

            return MapScheduleInfoResponse(result);
        }
    }
}