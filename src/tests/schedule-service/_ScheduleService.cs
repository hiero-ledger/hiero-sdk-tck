// SPDX-License-Identifier: Apache-2.0
using System;

namespace Hiero.TCK.Tests.ScheduleService
{
    public class ScheduleService : Service
    {
        private readonly SdkService sdkService;

        public ScheduleService(SdkService sdkService)
        {
            sdkService = sdkService ?? throw new ArgumentNullException(nameof(sdkService));
        }
    }
}