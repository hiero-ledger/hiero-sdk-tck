// SPDX-License-Identifier: Apache-2.0
using Hiero.SDK;
using Hiero.SDK.Core;
using Hiero.SDK.Cryptocurrency;
using Hiero.SDK.Cryptography;
using Hiero.SDK.Fee;
using Hiero.SDK.Token;
using Hiero.TCK.Util;
using Org.BouncyCastle.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json.Nodes;
using static Hiero.TCK.Util.KeyUtils;

namespace Hiero.TCK.Tests
{
    public abstract class Parameters(Dictionary<string, object> parameters)
    {
        public string SessionId { get; } = parameters["sessionId"] as string ?? throw new ArgumentException("sessionId is required and must be a non-empty string");
    }

    public class CommonTransactionParams
    {
        public string? TransactionId { get; init; }
        public long? MaxTransactionFee { get; init; }
        public long? ValidTransactionDuration { get; init; }
        public string? Memo { get; init; }
        public bool? RegenerateTransactionId { get; init; }
        public IList<string>? Signers { get; init; }

        public CommonTransactionParams(Dictionary<string, object> jrpcParams)
        {
            TransactionId = jrpcParams["transactionId"] as string;
            MaxTransactionFee = jrpcParams["maxTransactionFee"] as long?;
            ValidTransactionDuration = jrpcParams["validTransactionDuration"] as long?;
            Memo = jrpcParams["memo"] as string;
            RegenerateTransactionId = jrpcParams["regenerateTransactionId"] as bool?;
            
            if (jrpcParams.ContainsKey("signers"))
            {
                IList<string> jsonArray = jrpcParams["signers"] as IList<string>;
                Signers = [.. jsonArray.Select(_ => _.ToString())];
            }
        }

        public virtual void FillOutTransaction(ITransaction transaction, Client client)
        {
            // if (TransactionId is not null) transaction.TransactionId = SDK.Transactions.TransactionId.Generate(AccountId.FromString(TransactionId));
            if (MaxTransactionFee is not null) transaction.MaxTransactionFee = Hbar.FromTinybars(MaxTransactionFee.Value);
            if (ValidTransactionDuration is not null) transaction.TransactionValidDuration = TimeSpan.FromSeconds(ValidTransactionDuration.Value);
            if (Memo is not null) transaction.TransactionMemo = Memo;
            // if (RegenerateTransactionId is not null) transaction.ShouldRegenerateTransactionId = RegenerateTransactionId.Value;
            if (Signers is not null) 
            {
                //transaction.FreezeWith(client);

                foreach (string item in Signers)
                {
                    var pk = PrivateKey.FromString(item);
                    //transaction.Sign(pk);
                }
            };
        }
    }
    public class CustomFee(Dictionary<string, object> jrpcParams) : Parameters(jrpcParams)
    {
        public string? FeeCollectorAccountId { get; init; } = jrpcParams["feeCollectorAccountId"] as string;
        public bool? FeeCollectorsExempt { get; init; } = jrpcParams["feeCollectorsExempt"] as bool?;
        public FixedFee? FixedFee_ { get; init; } = jrpcParams["fixedFee"] is Dictionary<string, object> fixedFee ? new FixedFee(fixedFee) : null;
        public FractionalFee? FractionalFee_ { get; init; } = jrpcParams["fractionalFee"] is Dictionary<string, object> fractionalFee ? new FractionalFee(fractionalFee) : null;
        public RoyaltyFee? RoyaltyFee_ { get; init; } = jrpcParams["royaltyFee"] is Dictionary<string, object> royaltyFee ? new RoyaltyFee(royaltyFee) : null;


        public class FixedFee(Dictionary<string, object> jrpcParams)
        {
            public string? Amount { get; init; } = jrpcParams["amount"] as string;
            public string? DenominatingTokenId { get; init; } = jrpcParams["denominatingTokenId"] as string;
        }

        public class FractionalFee(Dictionary<string, object> jrpcParams)
        {
            public string? Numerator { get; init; } = jrpcParams["numerator"] as string;
            public string? Denominator { get; init; } = jrpcParams["denominator"] as string;
            public string? MinimumAmount { get; init; } = jrpcParams["minimumAmount"] as string;
            public string? MaximumAmount { get; init; } = jrpcParams["maximumAmount"] as string;
            public string? AssessmentMethod { get; init; } = jrpcParams["assessmentMethod"] as string;
        }

        public class RoyaltyFee(Dictionary<string, object> jrpcParams)
        {
            public string? Numerator { get; init; } = jrpcParams["numerator"] as string;
            public string? Denominator { get; init; } = jrpcParams["denominator"] as string;
            public FixedFee? FallbackFee { get; init; } = jrpcParams["fallbackFee"] is Dictionary<string, object> fallbackFees ? new FixedFee(fallbackFees) : null;
        }

        public virtual List<SDK.Fee.CustomFee> FillOutCustomFees(IList<CustomFee> customFees)
        {
            if (customFees == null || customFees.Count == 0)
                return new List<SDK.Fee.CustomFee>();

            var result = new List<SDK.Fee.CustomFee>();

            foreach (var customFee in customFees)
            {
                var collectorId = AccountId.FromString(customFee.FeeCollectorAccountId);
                var isExempt = customFee.FeeCollectorsExempt;

                if (customFee.FixedFee_ is { } fixedFee)
                {
                    result.Add(new CustomFixedFee
                    {
                        Amount = long.Parse(fixedFee.Amount),
                        FeeCollectorAccountId = collectorId,
                        AllCollectorsAreExempt = isExempt.Value,
                        DenominatingTokenId = !string.IsNullOrWhiteSpace(fixedFee.DenominatingTokenId)
                            ? TokenId.FromString(fixedFee.DenominatingTokenId)
                            : null
                    });
                }

                if (customFee.FractionalFee_ is { } fractionalFee)
                {
                    result.Add(new CustomFractionalFee
                    {
                        Numerator = long.Parse(fractionalFee.Numerator),
                        Denominator = long.Parse(fractionalFee.Denominator),
                        Min = long.Parse(fractionalFee.MinimumAmount),
                        Max = long.Parse(fractionalFee.MaximumAmount),
                        FeeCollectorAccountId = collectorId,
                        AllCollectorsAreExempt = isExempt.Value,
                        AssessmentMethod = string.Equals(
                            fractionalFee.AssessmentMethod,
                            "inclusive",
                            StringComparison.OrdinalIgnoreCase)
                            ? FeeAssessmentMethod.Inclusive
                            : FeeAssessmentMethod.Exclusive
                    });
                }

                if (customFee.RoyaltyFee_ is { } royaltyFee)
                {
                    result.Add(new CustomRoyaltyFee
                    {
                        Numerator = long.Parse(royaltyFee.Numerator),
                        Denominator = long.Parse(royaltyFee.Denominator),
                        FeeCollectorAccountId = collectorId,
                        AllCollectorsAreExempt = isExempt.Value,
                        FallbackFee = royaltyFee.FallbackFee is { } fb
                            ? new CustomFixedFee
                            {
                                Amount = long.Parse(fb.Amount),
                                DenominatingTokenId = !string.IsNullOrWhiteSpace(fb.DenominatingTokenId)
                                    ? TokenId.FromString(fb.DenominatingTokenId)
                                    : null
                            }
                            : null
                    });
                }
            }

            return result;
        }
    }
    public class GenerateKeyParams(Dictionary<string, object> jrpcParams) : Parameters(jrpcParams)
    {
        public KeyType? Type { get; init; } = Enum.TryParse(jrpcParams["type"] as string, out KeyType keytype) ? keytype : new KeyType?();
        public string? FromKey { get; init; } = jrpcParams["fromKey"] as string;
        public long? Threshold { get; init; } = jrpcParams["threshold"] as long?;
        public IList<GenerateKeyParams>? Keys { get; init; } = jrpcParams["keys"] is object[] keys
            ? [.. keys.Select(_ => new GenerateKeyParams((Dictionary<string, object>)_))]
            : null;
    }
    public class SetupParams(Dictionary<string, object> jrpcParams) : Parameters(jrpcParams)
    {
        public string? OperatorAccountId { get; init; } = jrpcParams["operatorAccountId"] as string;
        public string? OperatorPrivateKey { get; init; } = jrpcParams["operatorPrivateKey"] as string;
        public string? NodeIp { get; init; } = jrpcParams["nodeIp"] as string;
        public string? NodeAccountId { get; init; } = jrpcParams["nodeAccountId"] as string;
        public string? MirrorNetworkIp { get; init; } = jrpcParams["mirrorNetworkIp"] as string;
    }
}