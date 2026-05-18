// SPDX-License-Identifier: Apache-2.0
using System;

namespace Hiero.TCK.Tests.NodeService
{
    public class NodeService : Service
    {
        protected static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(10);

        private readonly SdkService sdkService;
        public NodeService(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }
    }
}