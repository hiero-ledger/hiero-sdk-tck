// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class TransferParams
    {
        public TransferParams(Dictionary<string, object> jrpcParams)
        {
            Hbar = jrpcParams["hbar"] is Dictionary<string, object> hbar ? new HbarTransferParams(hbar) : null;
            Token = jrpcParams["token"] is Dictionary<string, object> token ? new TokenTransferParams(token) : null;
            Nft = jrpcParams["nft"] is Dictionary<string, object> nfts ? new NftTransferParams(nfts) : null;
            Approved = jrpcParams["approved"] is bool approved ? approved : null;

            // Only one transfer type should be allowed
            bool hasOnlyHbar = Hbar is not null && Token is null && Nft is null;
            bool hasOnlyToken = Hbar is null && Token is not null && Nft is null;
            bool hasOnlyNft = Hbar is null && Token is null && Nft is not null;

            if (!hasOnlyHbar && !hasOnlyToken && !hasOnlyNft)
                throw new ArgumentException("invalid parameters: only one type of transfer SHALL be provided.");
        }

        public HbarTransferParams? Hbar { get; init; }
        public TokenTransferParams? Token { get; init; }
        public NftTransferParams? Nft { get; init; }
        public bool? Approved { get; init; }
    }
}