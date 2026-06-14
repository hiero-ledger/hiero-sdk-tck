// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenAirdropCancelParams : Parameters
    {
        public TokenAirdropCancelParams(Dictionary<string, object> parameters) : base(parameters)
        {
            var pendingAirdropsList = parameters["pendingAirdrops"] as IList<object>;
            if (pendingAirdropsList != null)
            {
                PendingAirdrops = pendingAirdropsList.Select(item =>
                {
                    try
                    {
                        var airdropMap = (Dictionary<string, object>)item;
                        return new PendingAirdropParams(airdropMap);
                    }
                    catch (Exception e)
                    {
                        throw new Exception("Failed to parse pending airdrop parameters", e);
                    }
                }).ToList();
            }

            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public IList<PendingAirdropParams>? PendingAirdrops { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}