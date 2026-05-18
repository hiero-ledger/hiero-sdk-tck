// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;

namespace Hiero.TCK.Tests.FileService.Responses
{
    public class FileResponse(string? fileId, ResponseStatus? status)
    {
        public string? FileId { get; init; } = fileId;
        public ResponseStatus? Status { get; init; } = status;
    }
}