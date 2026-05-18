// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using Hiero.SDK;
using Hiero.SDK.Consensus;
using Hiero.TCK.Tests.TopicService.Params;
using Hiero.TCK.Tests.TopicService.Responses;

namespace Hiero.TCK.Tests.TopicService
{
    public partial class TestTopic
    {
        public virtual TopicInfoResponse GetTopicInfo(TopicInfoQueryParams @params)
        {
            TopicInfoQuery query = QueryBuilders.TopicBuilder.BuildTopicInfoQuery(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            TopicInfo result = query.Execute(client);

            return MapTopicInfoResponse(result);
        }
    }
}