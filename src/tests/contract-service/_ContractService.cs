// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Contract;
using Hiero.TCK.Tests.ContractService.Responses;

using System;

namespace Hiero.TCK.Tests.ContractService
{
    public class ContractService : Service
    {
        private static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(10);
        private readonly SdkService sdkService;

        public ContractService(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }
    }
}