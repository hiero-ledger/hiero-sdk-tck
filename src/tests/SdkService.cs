// SPDX-License-Identifier: Apache-2.0
using Hiero.Reference.Core;
using Hiero.SDK;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Cryptography;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests
{
    /// <summary>
    /// SdkService for managing the {@link Client} setup and reset
    /// </summary>
    public class SdkService : Service
    {
        private readonly IDictionary<string, Client> clients = new ConcurrentDictionary<string, Client>();
        public virtual SetupResponse Setup(SetupParams @params)
        {
            ExecutorService clientExecutor = new () { };
            string clientType;
            if (@params.NodeIp is not null && @params.NodeAccountId is not null && @params.MirrorNetworkIp is not null)
            {
                // Custom client setup
                Dictionary<string, AccountId> node = [];
                var nodeId = AccountId.FromString(@params.NodeAccountId);
                node.Add(@params.NodeIp, nodeId);
                Client client_custom = Client.ForNetwork(node, clientExecutor);
                clientType = "custom";
                client_custom.MirrorNetwork_.Network = [@params.MirrorNetworkIp];
                RegisterClient(@params.SessionId, client_custom);
            }
            else
            {
                // Default to testnet
                Client client_testnet = Client.ForTestnet(clientExecutor);
                clientType = "testnet";
                RegisterClient(@params.SessionId, client_testnet);
            }

            Client client = GetClient(@params.SessionId);
            client.OperatorSet(AccountId.FromString(@params.OperatorAccountId), PrivateKey.FromString(@params.OperatorPrivateKey));
            return new SetupResponse("Successfully setup " + clientType + " client.");
        }

        public virtual SetupResponse SetOperator(SetupParams @params)
        {
            Client client = GetClient(@params.SessionId);
            client.OperatorSet(AccountId.FromString(@params.OperatorAccountId), PrivateKey.FromString(@params.OperatorPrivateKey));
            return new SetupResponse("");
        }

        public virtual SetupResponse Reset(Parameters @params)
        {
            clients[@params.SessionId].Dispose();
            clients.Remove(@params.SessionId);

            return new SetupResponse("");
        }

        public virtual Client GetClient(string sessionId)
        {
            return clients[sessionId] ?? throw new System.Exception("No client found for session: " + sessionId);
        }

        private void RegisterClient(string sessionId, Client client)
        {
            if (clients.TryGetValue(sessionId, out Client? value))
            {
                value.Dispose();
                clients.Remove(sessionId);
            }

            clients.Add(sessionId, client);
        }
    }
}