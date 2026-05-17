// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Core;
using Hedera.Hashgraph.SDK.File;
using Hedera.Hashgraph.TCK.Tests.FileService.Params;
using Hedera.Hashgraph.TCK.Tests.FileService.Responses;
using Hedera.Hashgraph.TCK.Util;

namespace Hedera.Hashgraph.TCK.Tests.FileService
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