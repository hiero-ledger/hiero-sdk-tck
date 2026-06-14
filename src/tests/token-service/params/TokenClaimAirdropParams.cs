// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;

using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class TokenClaimAirdropParams : Parameters
    {
        public TokenClaimAirdropParams(Dictionary<string, object> parameters) : base(parameters)
        {
            SenderAccountId = parameters["senderAccountId"] as string;
            ReceiverAccountId = parameters["receiverAccountId"] as string;
            TokenId = parameters["tokenId"] as string;
            SerialNumbers = parameters["serialNumbers"] as IList<string>;
            CommonTransactionParams = new CommonTransactionParams(parameters);
        }

        public string? SenderAccountId { get; private set; }
        public string? ReceiverAccountId { get; private set; }
        public string? TokenId { get; private set; }
        public IList<string>? SerialNumbers { get; private set; }
        public CommonTransactionParams? CommonTransactionParams { get; private set; }
    }
}