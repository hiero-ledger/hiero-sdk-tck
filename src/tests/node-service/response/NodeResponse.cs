// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.NodeService.Responses
{
    public class NodeResponse(string? nodeId, ResponseStatus? status)
    {
        public string? NodeId { get; set; } = nodeId;
        public ResponseStatus? Status { get; set; } = status;
    }
}