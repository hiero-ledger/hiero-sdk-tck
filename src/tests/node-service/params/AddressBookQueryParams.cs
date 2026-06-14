// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.NodeService.Params
{
    public class AddressBookQueryParams : Parameters
    {
        public AddressBookQueryParams(Dictionary<string, object> parameters) : base(parameters)
        {
            FileId = parameters["fileId"] as string;
            Limit = parameters["limit"] as long?;
        }

        public string? FileId { get; private set; }
        public long? Limit { get; private set; }
    }
}