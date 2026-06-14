// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.FileService.Params
{
    public class FileAppendParams : Parameters
    {
        public FileAppendParams(Dictionary<string, object> parameters) : base(parameters)
        {
            FileId = parameters["fileId"] as string;
            Contents = parameters["contents"] as string;
            MaxChunks = parameters["maxChunks"] as long?;
            ChunkSize = parameters["chunkSize"] as long?;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? FileId { get; private set; }
        public string? Contents { get; private set; }
        public long? MaxChunks { get; private set; }
        public long? ChunkSize { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}