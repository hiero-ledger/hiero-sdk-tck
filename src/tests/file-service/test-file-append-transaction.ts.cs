// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.File;
using Hiero.TCK.Tests.FileService.Params;
using Hiero.TCK.Tests.FileService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.FileService
{
    public partial class TestFile 
    {
        public virtual FileResponse AppendFile(FileAppendParams @params)
        {
            FileAppendTransaction transaction = TransactionBuilders.FileBuilder.BuildAppend(@params);
            Client client = sdkService.GetClient(@params.SessionId);
            
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            
            TransactionResponse txResponse = transaction.Execute(client);
            TransactionReceipt receipt = txResponse.GetReceipt(client);

            return new FileResponse("", receipt.Status);
        }
    }
}