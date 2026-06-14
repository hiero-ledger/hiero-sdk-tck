// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;
using System.Linq;

using Hiero.SDK;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Token;
using Hiero.SDK.Nfts;
using Hiero.SDK.LiveHashes;
using Hiero.TCK.Tests.CryptoService.Responses;

namespace Hiero.TCK.Tests.CryptoService
{
    public class CryptoService : Service
    {
        private readonly SdkService sdkService;

        public CryptoService(SdkService sdkService)
        {
            this.sdkService = sdkService;
        }
    }
}