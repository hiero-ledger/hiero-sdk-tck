// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

namespace Hiero.TCK.Tests.NodeService.Responses
{
    public class AddressBookResponse
    {
        public readonly IList<NodeAddress> NodeAddresses = [];

        public class NodeAddress
        {
            public string? PublicKey { get; set; }
            public string? AccountId { get; set; }
            public long? NodeId { get; set; }
            public string? CertHash { get; set; }
            public IList<Endpoint>? ServiceEndpoints { get; set; }
            public string? Description { get; set; }
            public long? Stake { get; set; }
        }

        public class Endpoint
        {
            public string? Address { get; set; }
            public int? Port { get; set; }
            public string? DomainName { get; set; }
        }
    }
}