// SPDX-License-Identifier: Apache-2.0
using Google.Protobuf;

using Hiero.SDK;
using Hiero.SDK.File;
using Hiero.TCK.Tests.FileService.Params;
using Hiero.TCK.Tests.FileService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.FileService
{
    public partial class TestFile 
    {
        public virtual FileContentsResponse GetFileContents(FileContentsParams @params)
        {
            FileContentsQuery query = QueryBuilders.FileBuilder.BuildFileContents(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            ByteString response = query.Execute(client);

            // Convert ByteString to string
            string contents = response.ToStringUtf8();

            return new FileContentsResponse(contents);
        }
    }
}