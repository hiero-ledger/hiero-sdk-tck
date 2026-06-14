// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.ScheduleService.Responses
{
    public class ScheduleInfoResponse
    {
        public ScheduleInfoResponse() { }
        public ScheduleInfoResponse(string? cost) { Cost = cost; }
        public ScheduleInfoResponse(
            string? scheduleId,
            string? creatorAccountId,
            string? payerAccountId,
            string? adminKey,
            IList<string>? signers,
            string? scheduleMemo,
            string? expirationTime,
            string? executed,
            string? deleted,
            string? scheduledTransactionId,
            bool? waitForExpiry,
            string? cost)
        {
            ScheduleId = scheduleId;
            CreatorAccountId = creatorAccountId;
            PayerAccountId = payerAccountId;
            AdminKey = adminKey;
            Signers = signers;
            ScheduleMemo = scheduleMemo;
            ExpirationTime = expirationTime;
            Executed = executed;
            Deleted = deleted;
            ScheduledTransactionId = scheduledTransactionId;
            WaitForExpiry = waitForExpiry;
            Cost = cost;
        }

        public string? ScheduleId { get; set; }
        public string? CreatorAccountId { get; set; }
        public string? PayerAccountId { get; set; }
        public string? AdminKey { get; set; }
        public IList<string>? Signers { get; set; }
        public string? ScheduleMemo { get; set; }
        public string? ExpirationTime { get; set; }
        public string? Executed { get; set; }
        public string? Deleted { get; set; }
        public string? ScheduledTransactionId { get; set; }
        public bool? WaitForExpiry { get; set; }
        public string? Cost { get; set; }
    }
}