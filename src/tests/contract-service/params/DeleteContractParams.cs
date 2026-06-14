// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ContractService.Params
{
    public class DeleteContractParams : Parameters
    {
        public DeleteContractParams(Dictionary<string, object> parameters) : base(parameters)
        {
            ContractId = parameters["contractId"] as string;
            TransferAccountId = parameters["transferAccountId"] as string;
            TransferContractId = parameters["transferContractId"] as string;
            PermanentRemoval = parameters["permanentRemoval"] is bool b && b;
            CommonTransactionParams = parameters["commonTransactionParams"] as CommonTransactionParams;
        }

        public string? ContractId { get; set; }
        public string? TransferAccountId { get; set; }
        public string? TransferContractId { get; set; }
        public bool? PermanentRemoval { get; set; }
        public CommonTransactionParams CommonTransactionParams { get; set; }   
    }
}