// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.Ethereum;
using Hiero.TCK.Tests.Ethereum.Params;
using Hiero.TCK.Tests.Ethereum.Responses;
using Hiero.TCK.Util;

namespace Hiero.TCK.Tests.Ethereum
{
    public partial class TestEthereum 
    {
        public virtual EthereumTransactionResponse CreateEthereumTransaction(EthereumTransactionParams @params)
        {
            EthereumTransaction transaction = TransactionBuilders.EthereumBuilder.BuildCreate(@params);
            Client client = sdkService.GetClient(@params.SessionId);

            @params.CommonTransactionParams?.FillOutTransaction(transaction, client);

            TransactionReceipt receipt = transaction.Execute(client).GetReceipt(client);
            string contractId = "";
            if (receipt.Status == ResponseStatus.Success)
            {
                contractId = receipt.ContractId.ToString();
            }

            return new EthereumTransactionResponse(receipt.Status.ToString(), contractId);
        }
    }
}