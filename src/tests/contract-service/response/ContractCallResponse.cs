// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Contract;
using Hiero.SDK.Cryptocurrency;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Responses
{
    public class ContractCallResponse(
        string? contractId,
        ContractId? evmAddress,
        string? errorMessage,
        ulong? gasUsed,
        IList<ContractLogInfo>? logs,
        long? gas,
        Hbar? hbarAmount,
        AccountId? senderAccountId,
        long? signerNonce,
        string? rawResult)
    {
        public string? ContractId { get; set; } = contractId;
        public ContractId? EvmAddress { get; set; } = evmAddress;
        public string? ErrorMessage { get; set; } = errorMessage;
        public ulong? GasUsed { get; set; } = gasUsed;
        public IList<ContractLogInfo>? Logs { get; set; } = logs;
        public long? Gas { get; set; } = gas;
        public Hbar? HbarAmount { get; set; } = hbarAmount;
        public AccountId? SenderAccountId { get; set; } = senderAccountId;
        public long? SignerNonce { get; set; } = signerNonce;
        public string? RawResult { get; set; } = rawResult;
    }
}