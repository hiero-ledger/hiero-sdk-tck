// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK.Core;
using Hiero.SDK.Schedule;
using Hiero.TCK.Tests.ScheduleService.Params;
using Hiero.TCK.Tests.ScheduleService.Responses;
using Hiero.TCK.Util;

using System;
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.ScheduleService
{
    public partial class TestSchedule(SdkService sdkService) : ScheduleService(sdkService)
    {
        private static readonly TimeSpan DEFAULT_GRPC_DEADLINE = TimeSpan.FromSeconds(10);
        private static readonly IReadOnlyDictionary<string, Func<Dictionary<string, object>, ITransaction>> ScheduledTransactionBuilders = new Dictionary<string, Func<Dictionary<string, object>, ITransaction>>
        {
            ["transferCrypto"] = TransactionBuilders.TransferBuilder.BuildTransfer,
            ["submitMessage"] = TransactionBuilders.TopicBuilder.BuildSubmitMessage,
            ["burnToken"] = TransactionBuilders.TokenBuilder.BuildBurn,
            ["mintToken"] = TransactionBuilders.TokenBuilder.BuildMint,
            ["approveAllowance"] = TransactionBuilders.AccountBuilder.BuildApproveAllowance,
            ["createAccount"] = TransactionBuilders.AccountBuilder.BuildCreate,
            ["createToken"] = TransactionBuilders.TokenBuilder.BuildCreate,
            ["createTopic"] = TransactionBuilders.TopicBuilder.BuildCreate,
            ["createFile"] = TransactionBuilders.FileBuilder.BuildCreate,
            ["updateAccount"] = TransactionBuilders.AccountBuilder.BuildUpdate,
            ["updateToken"] = TransactionBuilders.TokenBuilder.BuildUpdate,
            ["updateTopic"] = TransactionBuilders.TopicBuilder.BuildUpdate,
            ["updateFile"] = TransactionBuilders.FileBuilder.BuildUpdate,
            ["deleteAccount"] = TransactionBuilders.AccountBuilder.BuildDelete,
            ["deleteToken"] = TransactionBuilders.TokenBuilder.BuildDelete,
            ["deleteTopic"] = TransactionBuilders.TopicBuilder.BuildDelete,
            ["deleteFile"] = TransactionBuilders.FileBuilder.BuildDelete,
            ["associateToken"] = TransactionBuilders.TokenBuilder.BuildAssociate,
            ["dissociateToken"] = TransactionBuilders.TokenBuilder.BuildDissociate,
            ["freezeToken"] = TransactionBuilders.TokenBuilder.BuildFreeze,
            ["unfreezeToken"] = TransactionBuilders.TokenBuilder.BuildUnfreeze,
            ["grantKyc"] = TransactionBuilders.TokenBuilder.BuildGrantKyc,
            ["revokeKyc"] = TransactionBuilders.TokenBuilder.BuildRevokeKyc,
            ["pauseToken"] = TransactionBuilders.TokenBuilder.BuildPause,
            ["unpauseToken"] = TransactionBuilders.TokenBuilder.BuildUnpause,
            ["wipeToken"] = TransactionBuilders.TokenBuilder.BuildWipe,
            ["updateTokenFeeSchedule"] = TransactionBuilders.TokenBuilder.BuildUpdateFeeSchedule,
            ["airdropToken"] = TransactionBuilders.TokenBuilder.BuildAirdrop,
            ["cancelAirdrop"] = TransactionBuilders.TokenBuilder.BuildCancelAirdrop,
            ["claimToken"] = TransactionBuilders.TokenBuilder.BuildClaimAirdrop,
            ["deleteAllowance"] = TransactionBuilders.AccountBuilder.BuildDeleteAllowance,
            ["appendFile"] = TransactionBuilders.FileBuilder.BuildAppend
        };

        private ScheduleInfoResponse MapScheduleInfoResponse(ScheduleInfo scheduleInfo)
        {
            return new ScheduleInfoResponse(
                scheduleInfo.ScheduleId?.ToString(),
                scheduleInfo.CreatorAccountId?.ToString(),
                scheduleInfo.PayerAccountId?.ToString(),
                scheduleInfo.AdminKey?.ToString(),
                [.. scheduleInfo.Signatories.Select(k => k.ToString() ?? string.Empty)],
                scheduleInfo.Memo,
                scheduleInfo.ExpirationTime?.ToString(),
                scheduleInfo.ExecutedAt?.ToString(),
                scheduleInfo.DeletedAt?.ToString(),
                scheduleInfo.ScheduledTransactionId?.ToString(),
                scheduleInfo.WaitForExpiry,
                null
            );
        }

        private ITransaction BuildScheduledTransaction(ScheduleCreateParams.ScheduledTransaction scheduledTx, string sessionId)
        {
            var parameters = new Dictionary<string, object>(scheduledTx.Params ?? [])
            {
                ["sessionId"] = sessionId
            };

            if (!ScheduledTransactionBuilders.TryGetValue(scheduledTx.Method ?? "", out var builder))
            {
                throw new ArgumentException($"Unsupported scheduled transaction method: {scheduledTx.Method}", nameof(scheduledTx));
            }

            return builder.Invoke(parameters);
        }
    }
}