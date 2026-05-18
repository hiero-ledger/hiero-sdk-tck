// SPDX-License-Identifier: Apache-2.0

namespace Hiero.TCK.Tests.ContractService.Responses
{
    public class ContractByteCodeResponse(string? contractId, string? bytecode)
    {                                             
        public string? ContractId { get; init; } = contractId;
        public string? Bytecode { get; init; } = bytecode;
    }
}