// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.TokenService.Params
{
    public class PendingAirdropParams : Parameters
    {
        public PendingAirdropParams(Dictionary<string, object> parameters) : base(parameters)
        {
            TokenId = parameters["tokenId"] as string;
            SenderAccountId = parameters["senderAccountId"] as string;
            ReceiverAccountId = parameters["receiverAccountId"] as string;
            SerialNumbers = parameters["serialNumbers"] as IList<string>;
        }

        public string? TokenId { get; private set; }
        public string? SenderAccountId { get; private set; }
        public string? ReceiverAccountId { get; private set; }
        public IList<string>? SerialNumbers { get; private set; }
    }
}