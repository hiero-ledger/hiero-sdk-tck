// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.TokenService
{
    public partial class TokenService : Service
    {
        private readonly SdkService sdkService;
        public TokenService(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }
    }
}