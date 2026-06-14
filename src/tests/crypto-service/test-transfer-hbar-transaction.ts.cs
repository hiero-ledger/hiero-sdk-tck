// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.CryptoService.Params;
using Hiero.TCK.Tests.CryptoService.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.CryptoService
{
    public partial class TestTransfer
    {
        public virtual TransferResponse TransferHbar(TransferCryptoParams @params)
        {
            var transaction = TransactionBuilders.TransferBuilder.BuildTransfer(@params);
            var client = sdkService.GetClient(@params.SessionId);

            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);

            var transactionReceipt = transaction.Execute(client).GetReceipt(client);

            return new TransferResponse(transactionReceipt.Status);
        }
    }
}

