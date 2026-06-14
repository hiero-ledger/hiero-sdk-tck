// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Nfts;
using Hiero.SDK.Token;
using Hiero.TCK.Exceptions;
using Hiero.TCK.Tests.CryptoService.Params;
using System;

namespace Hiero.TCK.Util
{
    // Utility class for handling airdrop parameters
    public class AirdropUtils
    {
        public static void HandleAirdropParam(TokenAirdropTransaction transaction, TransferParams transferParam)
        {
            if (transferParam.Token is not null)
            {
                HandleAirdropTokenTransfer(transaction, transferParam);
            }
            else if (transferParam.Nft is not null)
            {
                HandleAirdropNftTransfer(transaction, transferParam);
            }
            else
            {
                throw new InvalidJSONRPC2ParamsException("Invalid transfer parameter");
            }
        }

        private static void HandleAirdropTokenTransfer(TokenAirdropTransaction transaction, TransferParams transferParam)
        {
            var token = transferParam.Token;
            AccountId accountId = AccountId.FromString(token.AccountId ??  throw new InvalidJSONRPC2ParamsException("AccountId is required"));
            TokenId tokenId = TokenId.FromString(token.TokenId ??  throw new InvalidJSONRPC2ParamsException("TokenId is required"));
            long amount;
            try
            {
                amount = long.Parse(token.Amount ?? throw new InvalidJSONRPC2ParamsException("Amount is required"));
            }
            catch (Exception e)
            {
                throw new InvalidJSONRPC2ParamsException("Invalid amount format");
            }

            bool isApproved = transferParam.Approved ?? false;
            if (token.Decimals is not null)
            {
                uint decimals = (uint)token.Decimals.Value;
                if (isApproved)
                {
                    transaction.AddApprovedTokenTransferWithDecimals(tokenId, accountId, amount, decimals);
                }
                else
                {
                    transaction.AddTokenTransferWithDecimals(tokenId, accountId, amount, decimals);
                }
            }
            else
            {
                if (isApproved)
                {
                    transaction.AddApprovedTokenTransfer(tokenId, accountId, amount);
                }
                else
                {
                    transaction.AddTokenTransfer(tokenId, accountId, amount);
                }
            }
        }

        private static void HandleAirdropNftTransfer(TokenAirdropTransaction transaction, TransferParams transferParam)
        {
            var nft = transferParam.Nft;
            AccountId senderAccountId = AccountId.FromString(nft.SenderAccountId ?? throw new InvalidJSONRPC2ParamsException("SenderAccountId is required"));
            AccountId receiverAccountId = AccountId.FromString(nft.ReceiverAccountId ?? throw new InvalidJSONRPC2ParamsException("ReceiverAccountId is required"));
            long serialNumber;
            try
            {
                serialNumber = long.Parse(nft.SerialNumber ?? throw new InvalidJSONRPC2ParamsException("SerialNumber is required"));
            }
            catch (Exception e)
            {
                throw new InvalidJSONRPC2ParamsException("Invalid serial number format");
            }

            TokenId tokenId = TokenId.FromString(nft.TokenId ?? throw new InvalidJSONRPC2ParamsException("TokenId is required"));
            NftId nftId = new (tokenId, serialNumber);
            bool isApproved = transferParam.Approved ?? false;
            if (isApproved)
            {
                transaction.AddApprovedNftTransfer(nftId, senderAccountId, receiverAccountId);
            }
            else
            {
                transaction.AddNftTransfer(nftId, senderAccountId, receiverAccountId);
            }
        }
    }
}