// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.TopicService.Params
{
    public class TopicInfoQueryParams : Parameters
    {
        public TopicInfoQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TopicId = (string)parameters["topicId"];
            QueryPayment = (string)parameters["queryPayment"];
            MaxQueryPayment = (string)parameters["maxQueryPayment"];
        }

        public string TopicId { get; init; }
        public string QueryPayment { get; init; }
        public string MaxQueryPayment { get; init; }
    }
}