// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.FileService.Params
{
    public class FileUpdateParams : Parameters
    {
        public FileUpdateParams(Dictionary<string, object> parameters) : base(parameters)
        {
            FileId = parameters["fileId"] as string;
            Keys = parameters["keys"] as IList<string>;
            Contents = parameters["contents"] as string;
            ExpirationTime = parameters["expirationTime"] as string;
            Memo = parameters["memo"] as string;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? FileId { get; private set; }
        public IList<string>? Keys { get; private set; }
        public string? Contents { get; private set; }
        public string? ExpirationTime { get; private set; }
        public string? Memo { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}