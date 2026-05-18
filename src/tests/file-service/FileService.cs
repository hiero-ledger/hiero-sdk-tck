// SPDX-License-Identifier: Apache-2.0
using System;

namespace Hiero.TCK.Tests.FileService
{
    public class FileService : Service
    {
        private static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(3);

        private readonly SdkService sdkService;
        public FileService(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }
    }
}