// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.CryptoService.Params;

using System;
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenAirdropParams : Parameters
    {
        public TokenAirdropParams(Dictionary<string, object> parameters) : base(parameters)
        {
            var tokenTransfersList = parameters["tokenTransfers"] as IList<object>;
            if (tokenTransfersList != null)
            {
                TokenTransfers = tokenTransfersList.Select(item =>
                {
                    try
                    {
                        var transferMap = (Dictionary<string, object>)item;
                        return new TransferParams(transferMap);
                    }
                    catch (Exception e)
                    {
                        throw new Exception("Failed to parse transfer parameters", e);
                    }
                }).ToList();
            }

            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public IList<TransferParams>? TokenTransfers { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}