// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.NodeService.Params
{
    public class NodeDeleteParams : Parameters
    {
        public NodeDeleteParams(Dictionary<string, object> parameters) : base(parameters)
        {
            NodeId = parameters["nodeId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? NodeId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}