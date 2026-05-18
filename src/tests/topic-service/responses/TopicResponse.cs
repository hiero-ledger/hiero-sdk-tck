// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.TopicService.Responses
{
    public class TopicResponse(string? topicId, ResponseStatus? status)
    {
        public string? TopicId { get; } = topicId;
        public ResponseStatus? Status { get; } = status;
    }
}