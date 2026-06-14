// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.ContractService.Params;
using Hiero.TCK.Tests.ContractService.Responses;
using Hiero.TCK.Util;

using Org.BouncyCastle.Utilities.Encoders;

using System.Linq;

namespace Hiero.TCK.Tests.ContractService
{
    public partial class TestContract 
    {
        public virtual ContractCallResponse ContractCallQuery(ContractCallQueryParams @params)
        {
            var query = QueryBuilders.BuildContractCall(@params);
            var client = sdkService.GetClient(@params.SessionId);
            var result = query.Execute(client);

            return new ContractCallResponse(
                result.ContractId?.ToString() ?? "",
                result.EvmAddress,
                result.ErrorMessage,
                result.GasUsed,
                result.Logs?.ToList(),
                result.Gas,
                result.HbarAmount,
                result.SenderAccountId,
                result.SignerNonce,
                Hex.ToHexString(result.AsBytes()));
        }
    }
}