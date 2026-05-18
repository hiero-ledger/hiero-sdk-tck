// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests.ContractService.Params;
using Hiero.TCK.Tests.ContractService.Responses;
using Hiero.TCK.Util;

using Org.BouncyCastle.Utilities.Encoders;

namespace Hiero.TCK.Tests.ContractService
{
    public partial class TestContract 
    {
        public virtual ContractByteCodeResponse ContractByteCodeQuery(ContractByteCodeQueryParams @params)
        {
            var query = QueryBuilders.BuildContractBytecode(@params);
            var client = sdkService.GetClient(@params.SessionId);
            var response = query.Execute(client);

            return new ContractByteCodeResponse(query.ContractId?.ToString(), Hex.ToHexString(response.ToByteArray()));
        }
    }
}