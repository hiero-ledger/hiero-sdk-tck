// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.FileService.Params
{
    public class FileDeleteParams : Parameters
    {
        public FileDeleteParams(Dictionary<string, object> parameters) : base(parameters)
        {
            FileId = parameters["fileId"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? FileId { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}