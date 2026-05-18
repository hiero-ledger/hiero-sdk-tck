// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TopicService.Params
{
    public class DeleteTopicParams : Parameters
    {
        public DeleteTopicParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TopicId = parameters["topicId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TopicId { get; init; }
        public CommonTransactionParams? CommonTransactionParams { get; init; }
    }
}