// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.File;
using Hiero.SDK.Networking;
using Hiero.TCK.Tests.NodeService.Params;
using Hiero.TCK.Tests.NodeService.Responses;

using Org.BouncyCastle.Utilities.Encoders;

using System.Linq;

namespace Hiero.TCK.Tests.NodeService
{
    public partial class TestAddress
    {
        public virtual AddressBookResponse AddressBookQuery(AddressBookQueryParams @params)
        {
            AddressBookQuery query = new ()
            {
                FileId = FileId.FromString(@params.FileId) 
            };

            Client client = sdkService.GetClient(@params.SessionId);
            NodeAddressBook addressBook = query.Execute(client);
            AddressBookResponse response = new ();

            foreach (NodeAddress address in addressBook.NodeAddresses)
                response.NodeAddresses.Add(new AddressBookResponse.NodeAddress
                {
                    PublicKey = address.PublicKey ?? "",
                    AccountId = address.AccountId?.ToString() ?? "",
                    NodeId = address.NodeId,
                    CertHash = address.CertHash?.ToString() ?? "",
                    ServiceEndpoints =
                    [
                        .. address.Addresses .Select((sdkEndpoint) => new AddressBookResponse.Endpoint
                        {
                            Address = sdkEndpoint.Address is not null ? Hex.ToHexString(sdkEndpoint.Address) : null,
                            Port = sdkEndpoint.Port,
                            DomainName = sdkEndpoint.DomainName ?? "",
                        })
                    ],
                    Description = address.Description,
                    Stake = address.Stake
                });

            return response;
        }
    }
}