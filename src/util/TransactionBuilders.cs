// SPDX-License-Identifier: Apache-2.0
using Google.Protobuf;

using Hedera.Hashgraph.Reference;
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Airdrops;
using Hedera.Hashgraph.SDK.Consensus;
using Hedera.Hashgraph.SDK.Cryptocurrency;
using Hedera.Hashgraph.SDK.Cryptography;
using Hedera.Hashgraph.SDK.Ethereum;
using Hedera.Hashgraph.SDK.File;
using Hedera.Hashgraph.SDK.Nfts;
using Hedera.Hashgraph.SDK.Token;
using Hedera.Hashgraph.SDK.Transactions;
using Hedera.Hashgraph.TCK.Tests.CryptoService.Params;
using Hedera.Hashgraph.TCK.Tests.Ethereum.Params;
using Hedera.Hashgraph.TCK.Tests.FileService.Params;
using Hedera.Hashgraph.TCK.Tests.TokenService.Params;
using Hedera.Hashgraph.TCK.Tests.TopicService.Params;

using Org.BouncyCastle.Utilities.Encoders;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Hedera.Hashgraph.TCK.Util
{
    public class TransactionBuilders
    {
        private static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(10);

        public class AccountBuilder
        {
            public static AccountCreateTransaction BuildCreate(AccountCreateParams @params)
            {
                AccountCreateTransaction transaction = new AccountCreateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var key = @params.Key;
                if (key != null)
                {
                    try
                    {
                        transaction.SetKeyWithoutAlias(KeyUtils.GetKeyFromString(key));
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }
                var initialBalance = @params.InitialBalance;
                if (initialBalance != null)
                    transaction.InitialBalance = Hbar.From(long.Parse(initialBalance), HbarUnit.TINYBAR);

                if (@params.ReceiverSignatureRequired != null)
                    transaction.ReceiverSigRequired = @params.ReceiverSignatureRequired.Value;

                var autoRenew = @params.AutoRenewPeriod;
                if (autoRenew != null)
                    transaction.AutoRenewPeriod = TimeSpan.FromSeconds(long.Parse(autoRenew));

                var memo = @params.Memo;
                if (memo != null)
                    transaction.AccountMemo = memo;

                var autoAssoc = @params.MaxAutoTokenAssociations;
                if (autoAssoc != null)
                    transaction.MaxAutomaticTokenAssociations = (int)autoAssoc.Value;

                var stakedAccount = @params.StakedAccountId;
                if (stakedAccount != null)
                    transaction.StakedAccountId = AccountId.FromString(stakedAccount);

                var stakedNode = @params.StakedNodeId;
                if (stakedNode != null)
                    transaction.StakedNodeId = long.Parse(stakedNode);

                if (@params.DeclineStakingReward != null)
                    transaction.DeclineStakingReward = @params.DeclineStakingReward.Value;

                var alias = @params.Alias;
                if (alias != null)
                    transaction.Alias = EvmAddress.FromString(alias);

                return transaction;
            }
            public static AccountCreateTransaction BuildCreate(Dictionary<string, object> @params)
            {
                try
                {
                    AccountCreateParams typedParams = new AccountCreateParams(@params);
                    return BuildCreate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AccountCreateParams", e);
                }
            }
            public static AccountUpdateTransaction BuildUpdate(AccountUpdateParams @params)
            {
                AccountUpdateTransaction transaction = new AccountUpdateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                var key = @params.Key;
                if (key != null)
                {
                    try
                    {
                        transaction.Key = KeyUtils.GetKeyFromString(key);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                if (@params.ReceiverSignatureRequired != null)
                    transaction.ReceiverSigRequired = @params.ReceiverSignatureRequired.Value;

                var autoRenew = @params.AutoRenewPeriod;
                if (autoRenew != null)
                    transaction.AutoRenewPeriod = TimeSpan.FromSeconds(long.Parse(autoRenew));

                var memo = @params.Memo;
                if (memo != null)
                    transaction.AccountMemo = memo;

                var expirationTime = @params.ExpirationTime;
                if (expirationTime != null)
                    transaction.ExpirationTime = DateTimeOffset.Now.AddSeconds(long.Parse(expirationTime));

                var autoAssoc = @params.MaxAutoTokenAssociations;
                if (autoAssoc != null)
                    transaction.MaxAutomaticTokenAssociations = (int)autoAssoc.Value;

                var stakedAccount = @params.StakedAccountId;
                if (stakedAccount != null)
                    transaction.StakedAccountId = AccountId.FromString(stakedAccount);

                var stakedNode = @params.StakedNodeId;
                if (stakedNode != null)
                    transaction.StakedNodeId = long.Parse(stakedNode);

                if (@params.DeclineStakingReward != null)
                    transaction.DeclineStakingReward = @params.DeclineStakingReward.Value;

                return transaction;
            }
            public static AccountUpdateTransaction BuildUpdate(Dictionary<string, object> @params)
            {
                try
                {
                    AccountUpdateParams typedParams = new AccountUpdateParams(@params);
                    return BuildUpdate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AccountUpdateParams", e);
                }
            }
            public static AccountDeleteTransaction BuildDelete(AccountDeleteParams @params)
            {
                AccountDeleteTransaction transaction = new AccountDeleteTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var deleteAccountId = @params.DeleteAccountId;
                if (deleteAccountId != null)
                    transaction.AccountId = AccountId.FromString(deleteAccountId);

                var transferAccountId = @params.TransferAccountId;
                if (transferAccountId != null)
                    transaction.TransferAccountId = AccountId.FromString(transferAccountId);

                return transaction;
            }
            public static AccountDeleteTransaction BuildDelete(Dictionary<string, object> @params)
            {
                try
                {
                    AccountDeleteParams typedParams = new AccountDeleteParams(@params);
                    return BuildDelete(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AccountDeleteParams", e);
                }
            }
            public static AccountAllowanceApproveTransaction BuildApproveAllowance(AccountAllowanceParams @params)
            {
                AccountAllowanceApproveTransaction transaction = new AccountAllowanceApproveTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var allowances = @params.Allowances;
                if (allowances != null)
                {
                    foreach (var allowance in allowances)
                    {
                        Approve(transaction, allowance);
                    }
                }
                return transaction;
            }
            public static AccountAllowanceApproveTransaction BuildApproveAllowance(Dictionary<string, object> @params)
            {
                try
                {
                    AccountAllowanceParams typedParams = (AccountAllowanceParams)new AccountAllowanceParams(@params);
                    return BuildApproveAllowance(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AccountAllowanceParams", e);
                }
            }
            public static AccountAllowanceDeleteTransaction BuildDeleteAllowance(AccountAllowanceParams @params)
            {
                AccountAllowanceDeleteTransaction transaction = new AccountAllowanceDeleteTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var allowances = @params.Allowances;
                if (allowances != null)
                {
                    foreach (var allowance in allowances)
                    {
                        Delete(transaction, allowance);
                    }
                }
                return transaction;
            }
            public static AccountAllowanceDeleteTransaction BuildDeleteAllowance(Dictionary<string, object> @params)
            {
                try
                {
                    AccountAllowanceParams typedParams = (AccountAllowanceParams)new AccountAllowanceParams(@params);
                    return BuildDeleteAllowance(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AccountAllowanceParams", e);
                }
            }

            private static void Approve(AccountAllowanceApproveTransaction tx, AllowanceParams allowance)
            {
                AccountId owner = AccountId.FromString(allowance.OwnerAccountId ?? throw new InvalidOperationException());
                AccountId spender = AccountId.FromString(allowance.SpenderAccountId ?? throw new InvalidOperationException());

                var hbar = allowance.Hbar;
                if (hbar != null)
                    tx.ApproveHbarAllowance(owner, spender, Hbar.FromTinybars(long.Parse(hbar.Amount)));

                var token = allowance.Token;
                if (token != null)
                    tx.ApproveTokenAllowance(TokenId.FromString(token.TokenId), owner, spender, token.Amount);

                var nft = allowance.Nft;
                if (nft != null)
                    ApproveNFT(tx, owner, spender, nft);
            }
            private static void Delete(AccountAllowanceDeleteTransaction tx, AllowanceParams allowance)
            {
                var owner = AccountId.FromString(allowance.OwnerAccountId ?? throw new InvalidOperationException());
                var tokenId = allowance.TokenId ?? throw new InvalidOperationException();
                var serialNumbers = allowance.SerialNumbers;
                if (serialNumbers != null && serialNumbers.Count > 0)
                {
                    foreach (var serialNumber in serialNumbers)
                    {
                        var nftId = new NftId(TokenId.FromString(tokenId), long.Parse(serialNumber));
                        tx.DeleteAllTokenNftAllowances(nftId, owner);
                    }
                }
            }
            private static void ApproveNFT(AccountAllowanceApproveTransaction tx, AccountId owner, AccountId spender, AllowanceParams.TokenNftAllowance nft)
            {
                TokenId tokenId = TokenId.FromString(nft.TokenId);
                string? delegateSpender = nft.DelegatingSpender;
                var serialNumbers = nft.SerialNumbers;

                if (serialNumbers != null && serialNumbers.Count > 0)
                {
                    foreach (var serial in serialNumbers)
                    {
                        NftId nftId = new NftId(tokenId, serial);
                        if (delegateSpender != null)
                        {
                            tx.ApproveTokenNftAllowance(nftId, owner, spender, AccountId.FromString(delegateSpender));
                        }
                        else
                        {
                            tx.ApproveTokenNftAllowance(nftId, owner, spender);
                        }
                    }
                }
                else if (nft.AllSerials)
                {
                    tx.ApproveTokenNftAllowanceAllSerials(tokenId, owner, spender);
                }
                else
                {
                    tx.DeleteTokenNftAllowanceAllSerials(tokenId, owner, spender);
                }
            }
        }

        public class TransferBuilder
        {
            public static TransferTransaction BuildTransfer(TransferCryptoParams @params)
            {
                TransferTransaction transaction = new TransferTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var transfers = @params.Transfers;
                if (transfers != null)
                {
                    foreach (var txParams in transfers)
                    {
                        TransferUtils.ProcessTransfer(transaction, txParams);
                    }
                }
                return transaction;
            }
            public static TransferTransaction BuildTransfer(Dictionary<string, object> @params)
            {
                try
                {
                    TransferCryptoParams typedParams = (TransferCryptoParams)new TransferCryptoParams(@params);
                    return BuildTransfer(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TransferCryptoParams", e);
                }
            }
        }

        public class TokenBuilder
        {
            private static TokenType ParseTokenType(string tokenType)
            {
                if ("ft".Equals(tokenType))
                {
                    return TokenType.FungibleCommon;
                }

                if ("nft".Equals(tokenType))
                {
                    return TokenType.NonFungibleUnique;
                }

                throw new ArgumentException("Invalid token type");
            }
            private static TokenSupplyType ParseSupplyType(string supplyType)
            {
                if ("infinite".Equals(supplyType))
                {
                    return TokenSupplyType.Infinite;
                }

                if ("finite".Equals(supplyType))
                {
                    return TokenSupplyType.Finite;
                }

                throw new ArgumentException("Invalid supply type");
            }
            private static void SetKey(string? keyStr, Action<Key> setter, string fieldLabel)
            {
                if (keyStr != null)
                {
                    try
                    {
                        setter(KeyUtils.GetKeyFromString(keyStr));
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException("Invalid " + fieldLabel + " key", e);
                    }
                }
            }
            private static void SetCustomFees(TokenCreateParams @params, TokenCreateTransaction transaction)
            {
                var customFees = @params.CustomFees;
                if (customFees != null && customFees.Count > 0)
                {
                    List<SDK.Fee.CustomFee> sdkCustomFees = customFees[0].FillOutCustomFees(customFees);
                    transaction.CustomFees = sdkCustomFees;
                }
            }

            public static TokenCreateTransaction BuildCreate(TokenCreateParams @params)
            {
                TokenCreateTransaction transaction = new TokenCreateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                SetKey(@params.AdminKey, _ => transaction.AdminKey = _, "admin");
                SetKey(@params.KycKey, _ => transaction.KycKey = _, "kyc");
                SetKey(@params.FreezeKey, _ => transaction.FreezeKey = _, "freeze");
                SetKey(@params.WipeKey, _ => transaction.WipeKey = _, "wipe");
                SetKey(@params.SupplyKey, _ => transaction.SupplyKey = _, "supply");
                SetKey(@params.FeeScheduleKey, _ => transaction.FeeScheduleKey = _, "fee schedule");
                SetKey(@params.PauseKey, _ => transaction.PauseKey = _, "pause");
                SetKey(@params.MetadataKey, _ => transaction.MetadataKey = _, "metadata");

                var name = @params.Name;
                if (name != null)
                    transaction.TokenName = name;

                var symbol = @params.Symbol;
                if (symbol != null)
                    transaction.TokenSymbol = symbol;

                var decimals = @params.Decimals;
                if (decimals != null)
                    transaction.Decimals = (uint)decimals.Value;

                var initialSupply = @params.InitialSupply;
                if (initialSupply != null)
                    transaction.InitialSupply = ulong.Parse(initialSupply);

                var treasuryAccountId = @params.TreasuryAccountId;
                if (treasuryAccountId != null)
                    transaction.TreasuryAccountId = AccountId.FromString(treasuryAccountId);

                if (@params.FreezeDefault != null)
                    transaction.FreezeDefault = @params.FreezeDefault.Value;

                var expirationTime = @params.ExpirationTime;
                if (expirationTime != null)
                    transaction.ExpirationTime = DateTimeOffset.Now.AddSeconds(long.Parse(expirationTime));

                var autoRenewAccountId = @params.AutoRenewAccountId;
                if (autoRenewAccountId != null)
                    transaction.AutoRenewAccountId = AccountId.FromString(autoRenewAccountId);

                var autoRenewPeriodSeconds = @params.AutoRenewPeriod;
                if (autoRenewPeriodSeconds != null)
                    transaction.AutoRenewPeriod = TimeSpan.FromSeconds(long.Parse(autoRenewPeriodSeconds));

                var memo = @params.Memo;
                if (memo != null)
                    transaction.TokenMemo = memo;

                var metadata = @params.Metadata;
                if (metadata != null)
                    transaction.TokenMetadata = Encoding.UTF8.GetBytes(metadata);

                var tokenType = @params.TokenType;
                if (tokenType != null)
                    transaction.TokenType = ParseTokenType(tokenType);

                var supplyType = @params.SupplyType;
                if (supplyType != null)
                    transaction.TokenSupplyType = ParseSupplyType(supplyType);

                var maxSupply = @params.MaxSupply;
                if (maxSupply != null)
                    transaction.MaxSupply = long.Parse(maxSupply);

                SetCustomFees(@params, transaction);
                return transaction;
            }
            public static TokenCreateTransaction BuildCreate(Dictionary<string, object> @params)
            {
                try
                {
                    TokenCreateParams typedParams = (TokenCreateParams)new TokenCreateParams(@params);
                    return BuildCreate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenCreateParams", e);
                }
            }
            public static TokenUpdateTransaction BuildUpdate(TokenUpdateParams @params)
            {
                TokenUpdateTransaction transaction = new () { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var adminKey = @params.AdminKey;
                if (adminKey != null)
                {
                    try
                    {
                        transaction.AdminKey = KeyUtils.GetKeyFromString(adminKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var kycKey = @params.KycKey;
                if (kycKey != null)
                {
                    try
                    {
                        transaction.KycKey = KeyUtils.GetKeyFromString(kycKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var freezeKey = @params.FreezeKey;
                if (freezeKey != null)
                {
                    try
                    {
                        transaction.FreezeKey = KeyUtils.GetKeyFromString(freezeKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var wipeKey = @params.WipeKey;
                if (wipeKey != null)
                {
                    try
                    {
                        transaction.WipeKey = KeyUtils.GetKeyFromString(wipeKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var supplyKey = @params.SupplyKey;
                if (supplyKey != null)
                {
                    try
                    {
                        transaction.SupplyKey = KeyUtils.GetKeyFromString(supplyKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var feeScheduleKey = @params.FeeScheduleKey;
                if (feeScheduleKey != null)
                {
                    try
                    {
                        transaction.FeeScheduleKey = KeyUtils.GetKeyFromString(feeScheduleKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var pauseKey = @params.PauseKey;
                if (pauseKey != null)
                {
                    try
                    {
                        transaction.PauseKey = KeyUtils.GetKeyFromString(pauseKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var metadataKey = @params.MetadataKey;
                if (metadataKey != null)
                {
                    try
                    {
                        transaction.MetadataKey = KeyUtils.GetKeyFromString(metadataKey);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException(e.Message, e);
                    }
                }

                var name = @params.Name;
                if (name != null)
                    transaction.TokenName = name;

                var symbol = @params.Symbol;
                if (symbol != null)
                    transaction.TokenSymbol = symbol;

                var memo = @params.Memo;
                if (memo != null)
                    transaction.TokenMemo = memo;

                var treasuryAccountId = @params.TreasuryAccountId;
                if (treasuryAccountId != null)
                    transaction.TreasuryAccountId = AccountId.FromString(treasuryAccountId);

                var autoRenewAccountId = @params.AutoRenewAccountId;
                if (autoRenewAccountId != null)
                    transaction.AutoRenewAccountId = AccountId.FromString(autoRenewAccountId);

                var autoRenewPeriodSeconds = @params.AutoRenewPeriod;
                if (autoRenewPeriodSeconds != null)
                    transaction.AutoRenewPeriod = TimeSpan.FromSeconds(long.Parse(autoRenewPeriodSeconds));

                var expirationTime = @params.ExpirationTime;
                if (expirationTime != null)
                    transaction.ExpirationTime = DateTimeOffset.Now.AddSeconds(long.Parse(expirationTime));

                var metadata = @params.Metadata;
                if (metadata != null)
                    transaction.TokenMetadata = Encoding.UTF8.GetBytes(metadata);

                return transaction;
            }
            public static TokenUpdateTransaction BuildUpdate(Dictionary<string, object> @params)
            {
                try
                {
                    TokenUpdateParams typedParams = (TokenUpdateParams)new TokenUpdateParams(@params);
                    return BuildUpdate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenUpdateParams", e);
                }
            }
            public static TokenDeleteTransaction BuildDelete(TokenDeleteParams @params)
            {
                TokenDeleteTransaction transaction = new TokenDeleteTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);
                return transaction;
            }
            public static TokenDeleteTransaction BuildDelete(Dictionary<string, object> @params)
            {
                try
                {
                    TokenDeleteParams typedParams = (TokenDeleteParams)new TokenDeleteParams(@params);
                    return BuildDelete(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenDeleteParams", e);
                }
            }
            public static TokenMintTransaction BuildMint(MintTokenParams @params)
            {
                TokenMintTransaction transaction = new TokenMintTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                try
                {
                    var amount = @params.Amount;
                    if (amount != null)
                        transaction.Amount = long.Parse(amount);
                }
                catch (FormatException)
                {
                    //transaction.Amount = -1;
                }

                var metadata = @params.Metadata;
                if (metadata != null)
                    transaction.Metadata = [.. metadata.Select(_ => Hex.Decode(_))];

                return transaction;
            }
            public static TokenMintTransaction BuildMint(Dictionary<string, object> @params)
            {
                try
                {
                    MintTokenParams typedParams = (MintTokenParams)new MintTokenParams(@params);
                    return BuildMint(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse MintTokenParams", e);
                }
            }
            public static TokenBurnTransaction BuildBurn(BurnTokenParams @params)
            {
                TokenBurnTransaction transaction = new TokenBurnTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                try
                {
                    var amount = @params.Amount;
                    if (amount != null)
                        transaction.Amount = ulong.Parse(amount);
                }
                catch (FormatException)
                {
                    //transaction.Amount = -1;
                }

                var serialNumbers = @params.SerialNumbers;
                if (serialNumbers != null)
                {
                    IList<long> tokenIdList = serialNumbers.Select(long.Parse).ToList();
                    transaction.Serials.Operate(_ => tokenIdList);
                }
                return transaction;
            }
            public static TokenBurnTransaction BuildBurn(Dictionary<string, object> @params)
            {
                try
                {
                    BurnTokenParams typedParams = (BurnTokenParams)new BurnTokenParams(@params);
                    return BuildBurn(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse BurnTokenParams", e);
                }
            }
            public static TokenWipeTransaction BuildWipe(TokenWipeParams @params)
            {
                TokenWipeTransaction transaction = new TokenWipeTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                try
                {
                    var amount = @params.Amount;
                    if (amount != null)
                        transaction.Amount = ulong.Parse(amount);
                }
                catch (FormatException)
                {
                    //transaction.Amount = -1;
                }

                var serialNumbers = @params.SerialNumbers;
                if (serialNumbers != null)
                {
                    IList<long> serialNumbersList = new List<long>();
                    foreach (string serialNumber in serialNumbers)
                    {
                        serialNumbersList.Add(long.Parse(serialNumber));
                    }
                    transaction.Serials.Operate(_ => serialNumbersList);
                }
                return transaction;
            }
            public static TokenWipeTransaction BuildWipe(Dictionary<string, object> @params)
            {
                try
                {
                    TokenWipeParams typedParams = (TokenWipeParams)new TokenWipeParams(@params);
                    return BuildWipe(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenWipeParams", e);
                }
            }

            public static TokenAssociateTransaction BuildAssociate(Dictionary<string, object> @params)
            {
                try
                {
                    AssociateDisassociateTokenParams typedParams = (AssociateDisassociateTokenParams)new AssociateDisassociateTokenParams(@params);
                    return BuildAssociate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AssociateDisassociateTokenParams", e);
                }
            }
            public static TokenAssociateTransaction BuildAssociate(AssociateDisassociateTokenParams @params)
            {
                TokenAssociateTransaction transaction = new TokenAssociateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                var tokenIds = @params.TokenIds;
                if (tokenIds != null)
                {
                    List<TokenId> tokenIdList = tokenIds.Select(TokenId.FromString).ToList();
                    transaction.TokenIds = tokenIdList;
                }
                return transaction;
            }
            public static TokenDissociateTransaction BuildDissociate(Dictionary<string, object> @params)
            {
                try
                {
                    AssociateDisassociateTokenParams typedParams = (AssociateDisassociateTokenParams)new AssociateDisassociateTokenParams(@params);
                    return BuildDissociate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse AssociateDisassociateTokenParams", e);
                }
            }
            public static TokenDissociateTransaction BuildDissociate(AssociateDisassociateTokenParams @params)
            {
                TokenDissociateTransaction transaction = new TokenDissociateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                var tokenIds = @params.TokenIds;
                if (tokenIds != null)
                {
                    IList<TokenId> tokenIdList = tokenIds.Select(TokenId.FromString).ToList();
                    transaction.TokenIds = tokenIdList;
                }
                return transaction;
            }
            public static TokenFreezeTransaction BuildFreeze(Dictionary<string, object> @params)
            {
                try
                {
                    FreezeUnfreezeTokenParams typedParams = (FreezeUnfreezeTokenParams)new FreezeUnfreezeTokenParams(@params);
                    return BuildFreeze(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse FreezeUnfreezeTokenParams", e);
                }
            }
            public static TokenFreezeTransaction BuildFreeze(FreezeUnfreezeTokenParams @params)
            {
                TokenFreezeTransaction transaction = new TokenFreezeTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                return transaction;
            }
            public static TokenUnfreezeTransaction BuildUnfreeze(Dictionary<string, object> @params)
            {
                try
                {
                    FreezeUnfreezeTokenParams typedParams = (FreezeUnfreezeTokenParams)new FreezeUnfreezeTokenParams(@params);
                    return BuildUnfreeze(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse FreezeUnfreezeTokenParams", e);
                }
            }
            public static TokenUnfreezeTransaction BuildUnfreeze(FreezeUnfreezeTokenParams @params)
            {
                TokenUnfreezeTransaction transaction = new TokenUnfreezeTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                return transaction;
            }
            public static TokenGrantKycTransaction BuildGrantKyc(Dictionary<string, object> @params)
            {
                try
                {
                    GrantRevokeTokenKycParams typedParams = (GrantRevokeTokenKycParams)new GrantRevokeTokenKycParams(@params);
                    return BuildGrantKyc(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse GrantRevokeTokenKycParams", e);
                }
            }
            public static TokenGrantKycTransaction BuildGrantKyc(GrantRevokeTokenKycParams @params)
            {
                TokenGrantKycTransaction transaction = new TokenGrantKycTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                return transaction;
            }
            public static TokenRevokeKycTransaction BuildRevokeKyc(Dictionary<string, object> @params)
            {
                try
                {
                    GrantRevokeTokenKycParams typedParams = (GrantRevokeTokenKycParams)new GrantRevokeTokenKycParams(@params);
                    return BuildRevokeKyc(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse GrantRevokeTokenKycParams", e);
                }
            }
            public static TokenRevokeKycTransaction BuildRevokeKyc(GrantRevokeTokenKycParams @params)
            {
                TokenRevokeKycTransaction transaction = new TokenRevokeKycTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var accountId = @params.AccountId;
                if (accountId != null)
                    transaction.AccountId = AccountId.FromString(accountId);

                return transaction;
            }
            public static TokenPauseTransaction BuildPause(Dictionary<string, object> @params)
            {
                try
                {
                    PauseUnpauseTokenParams typedParams = (PauseUnpauseTokenParams)new PauseUnpauseTokenParams(@params);
                    return BuildPause(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse PauseUnpauseTokenParams", e);
                }
            }
            public static TokenPauseTransaction BuildPause(PauseUnpauseTokenParams @params)
            {
                TokenPauseTransaction transaction = new TokenPauseTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                return transaction;
            }
            public static TokenUnpauseTransaction BuildUnpause(Dictionary<string, object> @params)
            {
                try
                {
                    PauseUnpauseTokenParams typedParams = (PauseUnpauseTokenParams)new PauseUnpauseTokenParams(@params);
                    return BuildUnpause(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse PauseUnpauseTokenParams", e);
                }
            }
            public static TokenUnpauseTransaction BuildUnpause(PauseUnpauseTokenParams @params)
            {
                TokenUnpauseTransaction transaction = new TokenUnpauseTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                return transaction;
            }
            public static TokenFeeScheduleUpdateTransaction BuildUpdateFeeSchedule(TokenUpdateFeeScheduleParams @params)
            {
                TokenFeeScheduleUpdateTransaction transaction = new TokenFeeScheduleUpdateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var tokenId = @params.TokenId;
                if (tokenId != null)
                    transaction.TokenId = TokenId.FromString(tokenId);

                var customFees = @params.CustomFees;
                if (customFees != null && customFees.Count > 0)
                {
                    List<SDK.Fee.CustomFee> sdkCustomFees = customFees[0].FillOutCustomFees(customFees);
                    transaction.CustomFees = sdkCustomFees;
                }
                return transaction;
            }
            public static TokenFeeScheduleUpdateTransaction BuildUpdateFeeSchedule(Dictionary<string, object> @params)
            {
                try
                {
                    TokenUpdateFeeScheduleParams typedParams = (TokenUpdateFeeScheduleParams)new TokenUpdateFeeScheduleParams(@params);
                    return BuildUpdateFeeSchedule(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenUpdateFeeScheduleParams", e);
                }
            }
            public static TokenAirdropTransaction BuildAirdrop(TokenAirdropParams @params)
            {
                TokenAirdropTransaction transaction = new TokenAirdropTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var transferParams = @params.TokenTransfers;
                if (transferParams != null)
                {
                    foreach (TransferParams transferParam in transferParams)
                    {
                        try
                        {
                            AirdropUtils.HandleAirdropParam(transaction, transferParam);
                        }
                        catch (Exception e)
                        {
                            throw new ArgumentException("Failed to handle airdrop transfer parameter", e);
                        }
                    }
                }
                return transaction;
            }
            public static TokenAirdropTransaction BuildAirdrop(Dictionary<string, object> @params)
            {
                try
                {
                    TokenAirdropParams typedParams = (TokenAirdropParams)new TokenAirdropParams(@params);
                    return BuildAirdrop(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenAirdropParams", e);
                }
            }
            public static TokenCancelAirdropTransaction BuildCancelAirdrop(TokenAirdropCancelParams @params)
            {
                TokenCancelAirdropTransaction transaction = new TokenCancelAirdropTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var pendingAirdrops = @params.PendingAirdrops;
                if (pendingAirdrops != null)
                {
                    foreach (PendingAirdropParams pendingAirdrop in pendingAirdrops)
                    {
                        string tokenId = pendingAirdrop.TokenId ?? throw new InvalidOperationException();
                        string senderAccountId = pendingAirdrop.SenderAccountId ?? throw new InvalidOperationException();
                        string receiverAccountId = pendingAirdrop.ReceiverAccountId ?? throw new InvalidOperationException();

                        var serialNumbers = pendingAirdrop.SerialNumbers;
                        if (serialNumbers != null && serialNumbers.Count > 0)
                        {
                            foreach (string serialNumber in serialNumbers)
                            {
                                PendingAirdropId pendingAirdropId = new PendingAirdropId(AccountId.FromString(senderAccountId), AccountId.FromString(receiverAccountId), new NftId(TokenId.FromString(tokenId), long.Parse(serialNumber)));
                                transaction.PendingAirdropIds.Add(pendingAirdropId);
                            }
                        }
                        else
                        {
                            PendingAirdropId pendingAirdropId = new PendingAirdropId(AccountId.FromString(senderAccountId), AccountId.FromString(receiverAccountId), TokenId.FromString(tokenId));
                            transaction.PendingAirdropIds.Add(pendingAirdropId);
                        }
                    }
                }
                return transaction;
            }
            public static TokenCancelAirdropTransaction BuildCancelAirdrop(Dictionary<string, object> @params)
            {
                try
                {
                    TokenAirdropCancelParams typedParams = (TokenAirdropCancelParams)new TokenAirdropCancelParams(@params);
                    return BuildCancelAirdrop(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenAirdropCancelParams", e);
                }
            }
            public static TokenClaimAirdropTransaction BuildClaimAirdrop(TokenClaimAirdropParams @params)
            {
                TokenClaimAirdropTransaction transaction = new TokenClaimAirdropTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                string senderAccountId = @params.SenderAccountId ?? throw new InvalidOperationException();
                string receiverAccountId = @params.ReceiverAccountId ?? throw new InvalidOperationException();
                string tokenId = @params.TokenId ?? throw new InvalidOperationException();

                var serialNumbers = @params.SerialNumbers;
                if (serialNumbers != null && serialNumbers.Count > 0)
                {
                    foreach (string serialNumber in serialNumbers)
                    {
                        PendingAirdropId pendingAirdropId = new PendingAirdropId(AccountId.FromString(senderAccountId), AccountId.FromString(receiverAccountId), new NftId(TokenId.FromString(tokenId), long.Parse(serialNumber)));
                        transaction.PendingAirdropIds.Add(pendingAirdropId);
                    }
                }
                else
                {
                    PendingAirdropId pendingAirdropId = new PendingAirdropId(AccountId.FromString(senderAccountId), AccountId.FromString(receiverAccountId), TokenId.FromString(tokenId));
                    transaction.PendingAirdropIds.Add(pendingAirdropId);
                }

                return transaction;
            }
            public static TokenRejectTransaction BuildRejectAirdrop(TokenRejectAirdropParams @params)
            {
                TokenRejectTransaction transaction = new TokenRejectTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                string ownerAccountId = @params.OwnerAccountId ?? throw new InvalidOperationException();
                transaction.OwnerId = AccountId.FromString(ownerAccountId);

                var serialNumbers = @params.SerialNumbers;
                if (serialNumbers != null && serialNumbers.Count > 0)
                {
                    var tokenIds = @params.TokenIds;
                    if (tokenIds != null && tokenIds.Count > 0)
                    {
                        foreach (string serialNumber in serialNumbers)
                        {
                            transaction.AddNftId(new NftId(TokenId.FromString(tokenIds[0]), long.Parse(serialNumber)));
                        }
                    }
                }
                else
                {
                    var tokenIds = @params.TokenIds;
                    if (tokenIds != null && tokenIds.Count > 0)
                    {
                        foreach (string id in tokenIds)
                        {
                            transaction.AddTokenId(TokenId.FromString(id));
                        }
                    }
                }

                return transaction;
            }
            public static TokenClaimAirdropTransaction BuildClaimAirdrop(Dictionary<string, object> @params)
            {
                try
                {
                    TokenClaimAirdropParams typedParams = (TokenClaimAirdropParams)new TokenClaimAirdropParams(@params);
                    return BuildClaimAirdrop(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse TokenClaimAirdropParams", e);
                }
            }
        }

        public class TopicBuilder
        {
            private static TimeSpan ParseDuration(string secondsStr, string label)
            {
                try
                {
                    long seconds = long.Parse(secondsStr);
                    return TimeSpan.FromSeconds(seconds);
                }
                catch (FormatException e)
                {
                    throw new ArgumentException("Invalid " + label + ": " + secondsStr, e);
                }
            }

            private static void SetAccountId(string? idStr, Action<AccountId> setter, string label)
            {
                if (idStr != null)
                {
                    try
                    {
                        setter(AccountId.FromString(idStr));
                    }
                    catch (Exception e)
                    {
                        throw new ArgumentException("Invalid " + label + ": " + idStr, e);
                    }
                }
            }
            private static void SetFeeExemptKeys(CreateTopicParams @params, TopicCreateTransaction transaction)
            {
                var keyStrings = @params.FeeExemptKeys;
                if (keyStrings != null)
                {
                    if (keyStrings.Count == 0)
                    {
                        transaction.FeeExemptKeys.Clear();
                    }
                    else
                    {
                        IList<Key> keys = new List<Key>();
                        foreach (string keyStr in keyStrings)
                        {
                            try
                            {
                                keys.Add(KeyUtils.GetKeyFromString(keyStr));
                            }
                            catch (InvalidProtocolBufferException e)
                            {
                                throw new ArgumentException("Invalid fee exempt key: " + keyStr, e);
                            }
                        }
                        transaction.FeeExemptKeys.Operate(_ => keys);
                    }
                }
            }
            private static void SetFeeExemptKeys(UpdateTopicParams @params, TopicUpdateTransaction transaction)
            {
                var keyStrings = @params.FeeExemptKeys;
                if (keyStrings != null)
                {
                    if (keyStrings.Count == 0)
                    {
                        transaction.FeeExemptKeys.Clear();
                    }
                    else
                    {
                        IList<Key> keys = new List<Key>();
                        foreach (string keyStr in keyStrings)
                        {
                            try
                            {
                                keys.Add(KeyUtils.GetKeyFromString(keyStr));
                            }
                            catch (InvalidProtocolBufferException e)
                            {
                                throw new ArgumentException("Invalid fee exempt key: " + keyStr, e);
                            }
                        }
                        transaction.FeeExemptKeys.Operate(_ => keys);
                    }
                }
            }
            private static void SetTopicId(string? topicIdStr, Action<TopicId> setter)
            {
                if (topicIdStr != null)
                {
                    try
                    {
                        setter(TopicId.FromString(topicIdStr));
                    }
                    catch (Exception e)
                    {
                        throw new ArgumentException("Invalid topic ID: " + topicIdStr, e);
                    }
                }
            }
            private static void SetTopicKey(string? keyStr, Action<Key> setter, string label)
            {
                if (keyStr != null)
                {
                    try
                    {
                        setter(KeyUtils.GetKeyFromString(keyStr));
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException("Invalid " + label + " key: " + keyStr, e);
                    }
                }
            }
            private static void SetTopicCustomFees(CreateTopicParams @params, TopicCreateTransaction transaction)
            {
                var customFees = @params.CustomFees;
                if (customFees != null)
                {
                    if (customFees.Count == 0)
                    {
                        transaction.CustomFees.Clear();
                    }
                    else
                    {
                        List<SDK.Fee.CustomFee> sdkCustomFees = customFees[0].FillOutCustomFees(customFees);
                        IList<SDK.Fee.CustomFixedFee> topicCustomFees = new List<SDK.Fee.CustomFixedFee>();
                        foreach (SDK.Fee.CustomFee fee in sdkCustomFees)
                        {
                            if (fee is SDK.Fee.CustomFixedFee)
                            {
                                topicCustomFees.Add((SDK.Fee.CustomFixedFee)fee);
                            }
                        }

                        if (topicCustomFees.Count > 0)
                        {
                            transaction.CustomFees.Operate(_ => topicCustomFees);
                        }
                    }
                }
            }
            private static void SetTopicCustomFees(UpdateTopicParams @params, TopicUpdateTransaction transaction)
            {
                var customFees = @params.CustomFees;
                if (customFees != null)
                {
                    if (customFees.Count == 0)
                    {
                        transaction.CustomFees.Clear();
                    }
                    else
                    {
                        List<SDK.Fee.CustomFee> sdkCustomFees = customFees[0].FillOutCustomFees(customFees);
                        IList<SDK.Fee.CustomFixedFee> topicCustomFees = new List<SDK.Fee.CustomFixedFee>();
                        foreach (SDK.Fee.CustomFee fee in sdkCustomFees)
                        {
                            if (fee is SDK.Fee.CustomFixedFee)
                            {
                                topicCustomFees.Add((SDK.Fee.CustomFixedFee)fee);
                            }
                        }

                        if (topicCustomFees.Count > 0)
                        {
                            transaction.CustomFees.Operate(_ => topicCustomFees);
                        }
                    }
                }
            }

            public static TopicCreateTransaction BuildCreate(CreateTopicParams @params)
            {
                TopicCreateTransaction transaction = new TopicCreateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var createMemo = @params.Memo;
                if (createMemo != null) transaction.TopicMemo = createMemo;
                SetTopicKey(@params.AdminKey, _ => transaction.AdminKey = _, "admin");
                SetTopicKey(@params.SubmitKey, _ => transaction.SubmitKey = _, "submit");
                SetTopicKey(@params.FeeScheduleKey, _ => transaction.FeeScheduleKey = _, "fee schedule");
                SetFeeExemptKeys(@params, transaction);
                var createAutoRenew = @params.AutoRenewPeriod;
                if (createAutoRenew != null) transaction.AutoRenewPeriod = ParseDuration(createAutoRenew, "auto renew period");
                SetAccountId(@params.AutoRenewAccountId, _ => transaction.AutoRenewAccountId = _, "auto renew account ID");
                SetTopicCustomFees(@params, transaction);
                return transaction;
            }
            public static TopicCreateTransaction BuildCreate(Dictionary<string, object> @params)
            {
                try
                {
                    CreateTopicParams typedParams = (CreateTopicParams)new CreateTopicParams(@params);
                    return BuildCreate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse CreateTopicParams", e);
                }
            }
            public static TopicUpdateTransaction BuildUpdate(UpdateTopicParams @params)
            {
                TopicUpdateTransaction transaction = new TopicUpdateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                SetTopicId(@params.TopicId, _ => transaction.TopicId = _);
                var updateMemo = @params.Memo;
                if (updateMemo != null) transaction.TopicMemo = updateMemo;
                SetTopicKey(@params.AdminKey, _ => transaction.AdminKey = _, "admin");
                SetTopicKey(@params.SubmitKey, _ => transaction.SubmitKey = _, "submit");
                SetTopicKey(@params.FeeScheduleKey, _ => transaction.FeeScheduleKey = _, "fee schedule");
                SetFeeExemptKeys(@params, transaction);
                var updateAutoRenew = @params.AutoRenewPeriod;
                if (updateAutoRenew != null) transaction.AutoRenewPeriod = ParseDuration(updateAutoRenew, "auto renew period");
                SetAccountId(@params.AutoRenewAccountId, _ => transaction.AutoRenewAccountId = _, "auto renew account ID");
                var updateExpiration = @params.ExpirationTime;
                if (updateExpiration != null) transaction.ExpirationTime = DateTimeOffset.Now.Add(ParseDuration(updateExpiration, "expiration time"));
                SetTopicCustomFees(@params, transaction);
                return transaction;
            }
            public static TopicUpdateTransaction BuildUpdate(Dictionary<string, object> @params)
            {
                try
                {
                    UpdateTopicParams typedParams = (UpdateTopicParams)new UpdateTopicParams(@params);
                    return BuildUpdate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse UpdateTopicParams", e);
                }
            }
            public static TopicDeleteTransaction BuildDelete(DeleteTopicParams @params)
            {
                TopicDeleteTransaction transaction = new TopicDeleteTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var topicIdStr = @params.TopicId;
                if (topicIdStr != null)
                {
                    try
                    {
                        transaction.TopicId = TopicId.FromString(topicIdStr);
                    }
                    catch (Exception e)
                    {
                        throw new ArgumentException("Invalid topic ID: " + topicIdStr, e);
                    }
                }
                return transaction;
            }
            public static TopicDeleteTransaction BuildDelete(Dictionary<string, object> @params)
            {
                try
                {
                    DeleteTopicParams typedParams = (DeleteTopicParams)new DeleteTopicParams(@params);
                    return BuildDelete(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse DeleteTopicParams", e);
                }
            }
            public static TopicMessageSubmitTransaction BuildSubmitMessage(SubmitTopicMessageParams @params)
            {
                TopicMessageSubmitTransaction transaction = new TopicMessageSubmitTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var topicIdStr = @params.TopicId;
                if (topicIdStr != null)
                {
                    try
                    {
                        transaction.TopicId = TopicId.FromString(topicIdStr);
                    }
                    catch (Exception e)
                    {
                        throw new ArgumentException("Invalid topic ID: " + topicIdStr, e);
                    }
                }

                var message = @params.Message;
                if (string.IsNullOrEmpty(message))
                {
                    throw new ArgumentException("Message is required");
                }
                transaction.Message = ByteString.CopyFromUtf8(message);

                var maxChunks = @params.MaxChunks;
                if (maxChunks != null)
                    transaction.MaxChunks = (int)maxChunks.Value;

                var chunkSize = @params.ChunkSize;
                if (chunkSize != null)
                    transaction.ChunkSize = (int)chunkSize.Value;

                var customFeeLimits = @params.CustomFeeLimits;
                if (customFeeLimits != null)
                {
                    foreach (Tests.TopicService.Params.CustomFeeLimit customFeeLimitParam in customFeeLimits)
                    {
                        SDK.Fee.CustomFeeLimit sdkCustomFeeLimit = new ();

                        var payerId = customFeeLimitParam.PayerId;
                        if (payerId != null)
                        {
                            try
                            {
                                sdkCustomFeeLimit.PayerId = AccountId.FromString(payerId);
                            }
                            catch (Exception e)
                            {
                                throw new ArgumentException("Invalid payer ID: " + payerId, e);
                            }
                        }

                        var fixedFees = customFeeLimitParam.FixedFees;
                        if (fixedFees != null)
                        {
                            IList<SDK.Fee.CustomFixedFee> sdkFixedFees = new List<SDK.Fee.CustomFixedFee>();
                            foreach (Tests.CustomFee.FixedFee fixedFee in fixedFees)
                            {
                                SDK.Fee.CustomFixedFee sdkFixedFee = new SDK.Fee.CustomFixedFee();
                                try
                                {
                                    sdkFixedFee.Amount = long.Parse(fixedFee.Amount);
                                }
                                catch (FormatException e)
                                {
                                    throw new ArgumentException("Invalid fixed fee amount: " + fixedFee.Amount, e);
                                }

                                var tokenIdStr = fixedFee.DenominatingTokenId;
                                if (tokenIdStr != null)
                                {
                                    try
                                    {
                                        sdkFixedFee.DenominatingTokenId = TokenId.FromString(tokenIdStr);
                                    }
                                    catch (Exception e)
                                    {
                                        throw new ArgumentException("Invalid denominating token ID: " + tokenIdStr, e);
                                    }
                                }
                                sdkFixedFees.Add(sdkFixedFee);
                            }
                            sdkCustomFeeLimit.CustomFees = [.. sdkFixedFees];
                        }
                        transaction.CustomFeeLimits.Add(sdkCustomFeeLimit);
                    }
                }
                return transaction;
            }
            public static TopicMessageSubmitTransaction BuildSubmitMessage(Dictionary<string, object> @params)
            {
                try
                {
                    SubmitTopicMessageParams typedParams = (SubmitTopicMessageParams)new SubmitTopicMessageParams(@params);
                    return BuildSubmitMessage(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse SubmitTopicMessageParams", e);
                }
            }
        }

        public class FileBuilder
        {
            public static FileCreateTransaction BuildCreate(FileCreateParams @params)
            {
                FileCreateTransaction transaction = new FileCreateTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };

                var keyStrings = @params.Keys;
                if (keyStrings != null)
                {
                    try
                    {
                        Key[] keys = new Key[keyStrings.Count];
                        for (int i = 0; i < keyStrings.Count; i++)
                        {
                            keys[i] = KeyUtils.GetKeyFromString(keyStrings[i]);
                        }
                        transaction.Keys = KeyList.Of(null, keys);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException("Invalid key format", e);
                    }
                }

                var contents = @params.Contents;
                if (contents != null)
                    transaction.Contents = Encoding.UTF8.GetBytes(contents);

                var expirationTimeStr = @params.ExpirationTime;
                if (expirationTimeStr != null)
                    transaction.ExpirationTime = DateTimeOffset.Now.AddSeconds(long.Parse(expirationTimeStr));

                var memo = @params.Memo;
                if (memo != null)
                    transaction.FileMemo = memo;

                return transaction;
            }
            public static FileCreateTransaction BuildCreate(Dictionary<string, object> @params)
            {
                try
                {
                    FileCreateParams typedParams = new FileCreateParams(@params);
                    return BuildCreate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse FileCreateParams", e);
                }
            }
            public static FileUpdateTransaction BuildUpdate(FileUpdateParams @params)
            {
                FileUpdateTransaction transaction = new () { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var fileId = @params.FileId;
                if (fileId != null)
                    transaction.FileId = FileId.FromString(fileId);

                var keyStrings = @params.Keys;
                if (keyStrings != null)
                {
                    try
                    {
                        Key[] keys = new Key[keyStrings.Count];
                        for (int i = 0; i < keyStrings.Count; i++)
                        {
                            keys[i] = KeyUtils.GetKeyFromString(keyStrings[i]);
                        }
                        transaction.Keys = KeyList.Of(null, keys);
                    }
                    catch (InvalidProtocolBufferException e)
                    {
                        throw new ArgumentException("Invalid key format", e);
                    }
                }

                var contents = @params.Contents;
                if (contents != null)
                    transaction.Contents = ByteString.CopyFromUtf8(contents);

                var expirationTimeStr = @params.ExpirationTime;
                if (expirationTimeStr != null)
                    transaction.ExpirationTime = DateTimeOffset.Now.AddSeconds(long.Parse(expirationTimeStr));

                var memo = @params.Memo;
                if (memo != null)
                    transaction.FileMemo = memo;

                return transaction;
            }
            public static FileUpdateTransaction BuildUpdate(Dictionary<string, object> @params)
            {
                try
                {
                    FileUpdateParams typedParams = new FileUpdateParams(@params);
                    return BuildUpdate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse FileUpdateParams", e);
                }
            }
            public static FileDeleteTransaction BuildDelete(FileDeleteParams @params)
            {
                FileDeleteTransaction transaction = new FileDeleteTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var fileId = @params.FileId;
                if (fileId != null)
                    transaction.FileId = FileId.FromString(fileId);
                return transaction;
            }
            public static FileDeleteTransaction BuildDelete(Dictionary<string, object> @params)
            {
                try
                {
                    FileDeleteParams typedParams = new FileDeleteParams(@params);
                    return BuildDelete(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse FileDeleteParams", e);
                }
            }
            public static FileAppendTransaction BuildAppend(FileAppendParams @params)
            {
                FileAppendTransaction transaction = new FileAppendTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var fileId = @params.FileId;
                if (fileId != null)
                    transaction.FileId = FileId.FromString(fileId);

                var contents = @params.Contents;
                if (contents != null)
                    transaction.Contents = ByteString.CopyFromUtf8(contents);

                var chunkSize = @params.ChunkSize;
                if (chunkSize != null)
                    transaction.ChunkSize = (int)chunkSize.Value;

                var maxChunks = @params.MaxChunks;
                if (maxChunks != null)
                    transaction.MaxChunks = (int)maxChunks.Value;

                return transaction;
            }
            public static FileAppendTransaction BuildAppend(Dictionary<string, object> @params)
            {
                try
                {
                    FileAppendParams typedParams = new FileAppendParams(@params);
                    return BuildAppend(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse FileAppendParams", e);
                }
            }
        }

        public class EthereumBuilder
        {
            public static EthereumTransaction BuildCreate(Dictionary<string, object> @params)
            {
                try
                {
                    EthereumTransactionParams typedParams = new EthereumTransactionParams(@params);
                    return BuildCreate(typedParams);
                }
                catch (Exception e)
                {
                    throw new ArgumentException("Failed to parse EthereumTransactionParam", e);
                }
            }
            public static EthereumTransaction BuildCreate(EthereumTransactionParams @params)
            {
                EthereumTransaction transaction = new EthereumTransaction { GrpcDeadline = DEFAULT_GRPC_DEADLINE };
                var ethereumData = @params.EthereumData;
                if (ethereumData != null)
                {
                    byte[] bytes = Hex.Decode(ethereumData);
                    transaction.EthereumData = bytes;
                }

                var callDataFileId = @params.CallDataFileId;
                if (callDataFileId != null)
                    transaction.CallDataFileId = FileId.FromString(callDataFileId);

                var maxGasAllowance = @params.MaxGasAllowance;
                if (maxGasAllowance != null)
                    transaction.MaxGasAllowanceHbar = Hbar.FromTinybars(long.Parse(maxGasAllowance));

                return transaction;
            }
        }
    }
}