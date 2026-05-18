// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.TopicService.Params
{
    /// <summary>
    /// SubmitTopicMessageParams for topic message submit method
    /// </summary>
    public class SubmitTopicMessageParams : Parameters
    {
        public SubmitTopicMessageParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TopicId = parameters["topicId"] as string;
            Message = parameters["message"] as string;
            MaxChunks = parameters["maxChunks"] as long?;
            ChunkSize = parameters["chunkSize"] as long?;

            var customFeeLimitsList = (IList<Dictionary<string, object>>)parameters["customFeeLimits"];
            if (customFeeLimitsList != null)
            {
                CustomFeeLimits = customFeeLimitsList.Select(customFeeLimitMap =>
                {
                    try
                    {
                        return new CustomFeeLimit(customFeeLimitMap);
                    }
                    catch (Exception e)
                    {
                        throw new Exception("Failed to parse custom fee limit", e);
                    }
                }).ToList();
            }

            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? TopicId { get; private set; }
        public string? Message { get; private set; }
        public long? MaxChunks { get; private set; }
        public long? ChunkSize { get; private set; }
        public IList<CustomFeeLimit>? CustomFeeLimits { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}