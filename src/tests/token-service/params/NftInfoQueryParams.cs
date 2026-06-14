// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class NftInfoQueryParams : Parameters
    {
        public NftInfoQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            NftId = parameters["nftId"] as string;
        }

        public string? NftId { get; private set; }
    }
}