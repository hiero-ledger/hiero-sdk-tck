// SPDX-License-Identifier: Apache-2.0

namespace Hiero.TCK.Tests.Ethereum.Responses
{
    public class EthereumTransactionResponse(string? status, string? contractId)
    {
        public string? Status { get; init; } = status;
        public string? ContractId { get; init; } = contractId;
    }
}