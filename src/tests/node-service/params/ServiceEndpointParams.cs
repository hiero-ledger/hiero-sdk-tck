// SPDX-License-Identifier: Apache-2.0
using System.Collections.Generic;

using Hiero.SDK;
using Hiero.TCK.Tests.NodeService.Responses;

using Org.BouncyCastle.Utilities.Encoders;

namespace Hiero.TCK.Tests.NodeService.Params
{
    public class ServiceEndpointParams : Parameters
    {
        public ServiceEndpointParams(Dictionary<string, object> parameters) : base(parameters)
        {
            IpAddressV4 = parameters["ipAddressV4"] as string;
            DomainName = parameters["domainName"] as string;
            
            object portObj = parameters["port"];
            if (portObj is int portValue)
            {
                Port = portValue;
            }
        }

        public string? IpAddressV4 { get; private set; }
        public string? DomainName { get; private set; }
        public int? Port { get; private set; }

        public virtual Endpoint ToSdkEndpoint()
        {
            var ep = new Endpoint();
            if (!string.IsNullOrEmpty(DomainName))
            {
                ep.DomainName = DomainName;
            }
            if (!string.IsNullOrEmpty(IpAddressV4))
            {
                ep.Address = Hex.Decode(IpAddressV4);
            }
            if (Port.HasValue)
            {
                ep.Port = Port.Value;
            }
            return ep;
        }
    }
}