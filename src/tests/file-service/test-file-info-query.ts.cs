// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.File;
using Hiero.TCK.Tests.FileService.Params;
using Hiero.TCK.Tests.FileService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.FileService
{
    public partial class TestFile 
    {
        public virtual FileInfoResponse GetFileInfo(FileInfoQueryParams @params)
        {
            FileInfoQuery query = QueryBuilders.FileBuilder.BuildFileInfoQuery(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            FileInfo result = query.Execute(client);

            return MapFileInfoResponse(result);
        }
    }
}