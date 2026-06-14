// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Params
{
    public class ContractCallQueryParams : Parameters
    {
        public ContractCallQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ContractId = parameters["contractId"] as string;
            Gas = parameters["gas"] as string;
            FunctionParameters = parameters["functionParameters"] as string;
            MaxResultSize = parameters["maxResultSize"] as string;
            SenderAccountId = parameters["senderAccountId"] as string;
        }

        public string? ContractId { get; set; }
        public string? Gas { get; set; }
        public string? FunctionParameters { get; set; }
        public string? MaxResultSize { get; set; }
        public string? SenderAccountId { get; set; }
    }
}