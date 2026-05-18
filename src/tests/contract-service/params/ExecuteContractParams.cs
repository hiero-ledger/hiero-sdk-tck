// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Params
{
    public class ExecuteContractParams : Parameters
    {
        public ExecuteContractParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ContractId = parameters["contractId"] as string;
            Gas = parameters["gas"] as string;
            Amount = parameters["amount"] as string;
            FunctionParameters = parameters["functionParameters"] as string;
            CommonTransactionParams = parameters["commonTransactionParams"] as CommonTransactionParams;
        }

        public string? ContractId { get; set; }
        public string? Gas { get; set; }
        public string? Amount { get; set; }
        public string? FunctionParameters { get; set; } // hex string
        public CommonTransactionParams? CommonTransactionParams { get; set; }
    }
}