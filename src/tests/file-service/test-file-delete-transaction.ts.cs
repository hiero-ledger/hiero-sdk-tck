// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.FileService.Params;
using Hiero.TCK.Tests.FileService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.FileService
{
    public partial class TestFile 
    {
        public virtual FileResponse DeleteFile(FileDeleteParams @params)
        {
            var transaction = TransactionBuilders.FileBuilder.BuildDelete(@params);
            var client = sdkService.GetClient(@params.SessionId);
            
            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);
            
            var txResponse = transaction.Execute(client);
            var receipt = txResponse.GetReceipt(client);

            return new FileResponse("", receipt.Status);
        }
    }
}