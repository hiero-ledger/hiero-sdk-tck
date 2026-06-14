// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.FileService.Params
{
    public class FileContentsParams : Parameters
    {
        public FileContentsParams(Dictionary<string, object> parameters) : base(parameters)
        {
            FileId = parameters["fileId"] as string;
            QueryPayment = parameters["queryPayment"] as string;
            MaxQueryPayment = parameters["maxQueryPayment"] as string;
        }

        public string? FileId { get; private set; }
        public string? QueryPayment { get; private set; }
        public string? MaxQueryPayment { get; private set; }
    }
}