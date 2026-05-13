// SPDX-License-Identifier: Apache-2.0
using Hedera.Hashgraph.SDK;
using Hedera.Hashgraph.SDK.Consensus;
using Hedera.Hashgraph.SDK.Contract;
using Hedera.Hashgraph.SDK.Cryptocurrency;
using Hedera.Hashgraph.SDK.File;
using Hedera.Hashgraph.SDK.Nfts;
using Hedera.Hashgraph.SDK.Schedule;
using Hedera.Hashgraph.SDK.Token;
using Hedera.Hashgraph.TCK.Tests.ContractService.Params;
using Hedera.Hashgraph.TCK.Tests.CryptoService.Params;
using Hedera.Hashgraph.TCK.Tests.FileService.Params;
using Hedera.Hashgraph.TCK.Tests.ScheduleService.Params;
using Hedera.Hashgraph.TCK.Tests.TokenService.Params;
using Hedera.Hashgraph.TCK.Tests.TopicService.Params;

using Org.BouncyCastle.Utilities.Encoders;

using System;

namespace Hedera.Hashgraph.TCK.Util
{
    public class QueryBuilders
    {
        private static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(10);

        /// <summary>
        /// Token-related query builders
        /// </summary>
        public class TokenBuilder
        {
            public static TokenInfoQuery BuildTokenInfo(TokenInfoQueryParams @params)
            {
                TokenInfoQuery query = new TokenInfoQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    TokenId = @params.TokenId is not null ? TokenId.FromString(@params.TokenId) : null
                };

                return query;
            }

            public static TokenNftInfoQuery BuildNftInfo(NftInfoQueryParams @params)
            {
                TokenNftInfoQuery query = new TokenNftInfoQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    NftId = @params.NftId is not null ? NftId.FromString(@params.NftId) : null
                };

                return query;
            }
        }

        /// <summary>
        /// Account-related query builders
        /// </summary>
        public class AccountBuilder
        {
            public static AccountBalanceQuery BuildAccountBalanceQuery(AccountBalanceQueryParams @params)
            {
                AccountBalanceQuery query = new AccountBalanceQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    AccountId = @params.AccountId is not null ? AccountId.FromString(@params.AccountId) : null,
                    ContractId = @params.ContractId is not null ? ContractId.FromString(@params.ContractId) : null,
                };

                return query;
            }
        }

        /// <summary>
        /// Schedule-related query builders
        /// </summary>
        public class ScheduleBuilder
        {
            public static ScheduleInfoQuery BuildScheduleInfoQuery(ScheduleInfoParams @params)
            {
                ScheduleInfoQuery query = new ScheduleInfoQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    ScheduleId = @params.ScheduleId is not null ? ScheduleId.FromString(@params.ScheduleId) : null,
                    QueryPayment = @params.QueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.QueryPayment)) : null,
                    MaxQueryPayment = @params.MaxQueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.MaxQueryPayment)) : null,
                };
                
                return query;
            }
        }

        /// <summary>
        /// File-related query builders
        /// </summary>
        public class FileBuilder
        {
            public static FileInfoQuery BuildFileInfoQuery(FileInfoQueryParams @params)
            {
                FileInfoQuery query = new FileInfoQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    FileId = @params.FileId is not null ? FileId.FromString(@params.FileId) : null,
                    QueryPayment = @params.QueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.QueryPayment)) : null,
                    MaxQueryPayment = @params.MaxQueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.MaxQueryPayment)) : null,
                };

                return query;
            }

            public static FileContentsQuery BuildFileContents(FileContentsParams @params)
            {
                FileContentsQuery query = new FileContentsQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    FileId = @params.FileId is not null ? FileId.FromString(@params.FileId) : null,
                    QueryPayment = @params.QueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.QueryPayment)) : null,
                    MaxQueryPayment = @params.MaxQueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.MaxQueryPayment)) : null,
                };

                return query;
            }
        }

        /// <summary>
        /// Topic-related query builder
        /// </summary>
        public class TopicBuilder
        {
            public static TopicInfoQuery BuildTopicInfoQuery(TopicInfoQueryParams @params)
            {
                TopicInfoQuery query = new TopicInfoQuery 
                { 
                    GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                    TopicId = @params.TopicId is not null ? TopicId.FromString(@params.TopicId) : null,
                    QueryPayment = @params.QueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.QueryPayment)) : null,
                    MaxQueryPayment = @params.MaxQueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.MaxQueryPayment)) : null,
                };
                
                return query;
            }
        }

        public static ContractByteCodeQuery BuildContractBytecode(ContractByteCodeQueryParams @params)
        {
            ContractByteCodeQuery query = new ContractByteCodeQuery 
            { 
                GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                ContractId = @params.ContractId is not null ? ContractId.FromString(@params.ContractId) : null,
                QueryPayment = @params.QueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.QueryPayment)) : null,
                MaxQueryPayment = @params.MaxQueryPayment is not null ? Hbar.FromTinybars(long.Parse(@params.MaxQueryPayment)) : null,
            };

            return query;
        }

        public static ContractCallQuery BuildContractCall(ContractCallQueryParams @params)
        {
            ContractCallQuery query = new ContractCallQuery 
            { 
                GrpcDeadline = DEFAULT_GRPC_DEADLINE,
                ContractId = @params.ContractId is not null ? ContractId.FromString(@params.ContractId) : null,
                FunctionParameters = Hex.Decode(@params.FunctionParameters),
                SenderAccountId = @params.SenderAccountId is not null ? AccountId.FromString(@params.SenderAccountId) : null,
            };

            if (@params.Gas is not null) query.Gas = long.Parse(@params.Gas);
            if (@params.MaxResultSize is not null) query.MaxResultSize = long.Parse(@params.MaxResultSize);

            return query;
        }
    }
}