// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.Ethereum.Params
{
    public class EthereumTransactionParams : Parameters
    {
        public EthereumTransactionParams(Dictionary<string, object> parameters) : base(parameters)
        {
            EthereumData = parameters["ethereumData"] as string;
            CallDataFileId = parameters["callDataFileId"] as string;
            MaxGasAllowance = parameters["maxGasAllowance"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? EthereumData { get; private set; }
        public string? CallDataFileId { get; private set; }
        public string? MaxGasAllowance { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}