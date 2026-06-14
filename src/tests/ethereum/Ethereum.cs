// SPDX-License-Identifier: Apache-2.0

namespace Hiero.TCK.Tests.Ethereum
{
    public class Ethereum : Service
    {
        private readonly SdkService sdkService;
        public Ethereum(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }
    }
}