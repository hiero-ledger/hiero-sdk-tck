// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Core;
using Hedera.Hashgraph.SDK.Ethereum;
using Hedera.Hashgraph.TCK.Tests.Ethereum.Params;
using Hedera.Hashgraph.TCK.Tests.Ethereum.Responses;
using Hedera.Hashgraph.TCK.Util;

namespace Hedera.Hashgraph.TCK.Tests.Ethereum
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