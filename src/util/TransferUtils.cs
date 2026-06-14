// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Ethereum;
using Hiero.SDK.Nfts;
using Hiero.SDK.Token;
using Hiero.SDK.Transactions;
using Hiero.TCK.Exceptions;
using Hiero.TCK.Tests.CryptoService.Params;
using System;

namespace Hiero.TCK.Util
{
    public class TransferUtils
    {
        public static void ProcessTransfer(TransferTransaction transaction, TransferParams transferParam)
        {
            if (transferParam.Hbar is not null)
            {
                ProcessHbarTransfer(transaction, transferParam);
            }
            else if (transferParam.Token is not null)
            {
                ProcessTokenTransfer(transaction, transferParam);
            }
            else if (transferParam.Nft is not null)
            {
                ProcessNftTransfer(transaction, transferParam);
            }
            else
            {
                throw new InvalidJSONRPC2ParamsException("Invalid transfer parameter");
            }
        }

        private static void ProcessHbarTransfer(TransferTransaction transaction, TransferParams transferParam)
        {
            var hbar = transferParam.Hbar;
            long amount = long.Parse(hbar.Amount ?? throw new InvalidJSONRPC2ParamsException("Amount is required"));
            bool isApproved = transferParam.Approved ?? false;

            if (hbar.AccountId is not null)
            {
                AccountId accountId = AccountId.FromString(hbar.AccountId);
                if (isApproved)
                {
                    transaction.AddApprovedHbarTransfer(accountId, Hbar.FromTinybars(amount));
                }
                else
                {
                    transaction.AddHbarTransfer(accountId, Hbar.FromTinybars(amount));
                }
            }
            else if (hbar.EvmAddress is not null)
            {
                EvmAddress evmAddress = EvmAddress.FromString(hbar.EvmAddress);
                if (isApproved)
                {
                    transaction.AddApprovedHbarTransfer(evmAddress, Hbar.FromTinybars(amount));
                }
                else
                {
                    transaction.AddHbarTransfer(evmAddress, Hbar.FromTinybars(amount));
                }
            }
            else
            {
                throw new InvalidJSONRPC2ParamsException("Either accountId or evmAddress is required");
            }
        }

        private static void ProcessTokenTransfer(TransferTransaction transaction, TransferParams transferParam)
        {
            var token = transferParam.Token;
            AccountId accountId = AccountId.FromString(token.AccountId ?? throw new InvalidJSONRPC2ParamsException("AccountId is required"));
            TokenId tokenId = TokenId.FromString(token.TokenId ?? throw new InvalidJSONRPC2ParamsException("TokenId is required"));
            long amount = long.Parse(token.Amount ?? throw new InvalidJSONRPC2ParamsException("Amount is required"));
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

        private static void ProcessNftTransfer(TransferTransaction transaction, TransferParams transferParam)
        {
            var nft = transferParam.Nft;
            AccountId senderAccountId = AccountId.FromString(nft.SenderAccountId ?? throw new InvalidJSONRPC2ParamsException("SenderAccountId is required"));
            AccountId receiverAccountId = AccountId.FromString(nft.ReceiverAccountId ?? throw new InvalidJSONRPC2ParamsException("ReceiverAccountId is required"));
            long serialNumber = long.Parse(nft.SerialNumber ?? throw new InvalidJSONRPC2ParamsException("SerialNumber is required"));
            TokenId tokenId = TokenId.FromString(nft.TokenId ?? throw new InvalidJSONRPC2ParamsException("TokenId is required"));
            NftId nftId = new(tokenId, serialNumber);
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
