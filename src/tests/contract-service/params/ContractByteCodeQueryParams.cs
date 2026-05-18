// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Params
{
    public class ContractByteCodeQueryParams : Parameters
    {
        public ContractByteCodeQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ContractId = parameters["contractId"] as string;
            QueryPayment = parameters["queryPayment"] as string;
            MaxQueryPayment = parameters["maxQueryPayment"] as string;
        }

        public string? ContractId { get; set; }
        public string? QueryPayment { get; set; }
        public string? MaxQueryPayment { get; set; }
    }
}