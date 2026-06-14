// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Util;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Hiero.TCK.Tests.CryptoService.Params
{
    public class AllowanceParams : Parameters
    {
        public AllowanceParams(Dictionary<string, object> parameters) : base(parameters)
        {
            OwnerAccountId = parameters["ownerAccountId"] as string;
            SpenderAccountId = parameters["spenderAccountId"] as string;
            TokenId = parameters["tokenId"] as string;

            var serialNumbersList = parameters["serialNumbers"] as IList<string>;
            if (serialNumbersList != null)
            {
                SerialNumbers = serialNumbersList;
            }

            if (parameters.ContainsKey("hbar"))
            {
                object hbarObject = parameters["hbar"];
                if (hbarObject is Dictionary<string, object> hbarMap)
                {
                    var amount = hbarMap["amount"] as string;
                    Hbar = new HbarAllowance(amount);
                }
            }

            if (parameters.ContainsKey("token"))
            {
                object tokenObject = parameters["token"];
                if (tokenObject is Dictionary<string, object> tokenMap)
                {
                    var amount = tokenMap["amount"] as string;
                    var tokenIdValue = tokenMap["tokenId"] as string;
                    Token = new TokenAllowance(tokenIdValue, OwnerAccountId, SpenderAccountId, long.Parse(amount));
                }
            }

            if (parameters.ContainsKey("nft"))
            {
                object nftObject = parameters["nft"];
                if (nftObject is Dictionary<string, object> nftMap)
                {
                    var tokenIdValue = nftMap["tokenId"] as string;
                    var delegateSpenderAccountId = nftMap["delegateSpenderAccountId"] as string;
                    var approvedForAll = nftMap["approvedForAll"] is bool b && b;
                    var nftSerialNumbers = nftMap["serialNumbers"] as IList<string>;
                    var serialList = nftSerialNumbers?.Select(long.Parse).ToList();
                    Nft = new TokenNftAllowance(tokenIdValue, OwnerAccountId, SpenderAccountId, delegateSpenderAccountId, serialList, approvedForAll);
                }
            }
        }

        public string? OwnerAccountId { get; private set; }
        public string? SpenderAccountId { get; private set; }
        public string? TokenId { get; private set; }
        public IList<string>? SerialNumbers { get; private set; }
        public HbarAllowance? Hbar { get; private set; }
        public TokenAllowance? Token { get; private set; }
        public TokenNftAllowance? Nft { get; private set; }

        public class HbarAllowance
        {
            public string Amount { get; }

            public HbarAllowance(string amount)
            {
                Amount = amount;
            }
        }

        public class TokenAllowance
        {
            public string TokenId { get; }
            public string OwnerAccountId { get; }
            public string SpenderAccountId { get; }
            public long Amount { get; }

            public TokenAllowance(string tokenId, string ownerAccountId, string spenderAccountId, long amount)
            {
                TokenId = tokenId;
                OwnerAccountId = ownerAccountId;
                SpenderAccountId = spenderAccountId;
                Amount = amount;
            }
        }

        public class TokenNftAllowance
        {
            public string TokenId { get; }
            public string OwnerAccountId { get; }
            public string SpenderAccountId { get; }
            public string? DelegatingSpender { get; }
            public IList<long>? SerialNumbers { get; }
            public bool AllSerials { get; }

            public TokenNftAllowance(string tokenId, string ownerAccountId, string spenderAccountId, string? delegatingSpender, IList<long>? serialNumbers, bool allSerials)
            {
                TokenId = tokenId;
                OwnerAccountId = ownerAccountId;
                SpenderAccountId = spenderAccountId;
                DelegatingSpender = delegatingSpender;
                SerialNumbers = serialNumbers;
                AllSerials = allSerials;
            }
        }
    }
}