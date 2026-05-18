// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class TransferCryptoParams : Parameters
    {
        public TransferCryptoParams(Dictionary<string, object> jrpcParams) : base(jrpcParams)
        {
            Transfers = [.. (jrpcParams["transfers"] as Dictionary<string, object>[]).Select(_ => new TransferParams(_))];
            CommonTransactionParams = new CommonTransactionParams(jrpcParams);
        }

        public IList<TransferParams>? Transfers { get; init; }
        public CommonTransactionParams? CommonTransactionParams { get; init; }
    }
}