// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.FileService.Responses
{
    public class FileInfoResponse(
        string? fileId,
        string? size,
        string? expirationTime,
        bool? isDeleted,
        string? memo,
        string? ledgerId,
        IList<string>? keys)
    {
        public string? FileId { get; init; } = fileId;
        public string? Size { get; init; } = size;
        public string? ExpirationTime { get; init; } = expirationTime;
        public bool? IsDeleted { get; init; } = isDeleted;
        public string? Memo { get; init; } = memo;
        public string? LedgerId { get; init; } = ledgerId;
        public IList<string>? Keys { get; init; } = keys;
    }
}