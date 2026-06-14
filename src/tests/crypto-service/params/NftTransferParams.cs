// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class NftTransferParams(Dictionary<string, object> jrpcParams)
    {
        public string? SenderAccountId { get; init; } = jrpcParams["senderAccountId"] as string;
        public string? ReceiverAccountId { get; init; } = jrpcParams["receiverAccountId"] as string;
        public string? TokenId { get; init; } = jrpcParams["tokenId"] as string;
        public string? SerialNumber { get; init; } = jrpcParams["serialNumber"] as string;
    }
}