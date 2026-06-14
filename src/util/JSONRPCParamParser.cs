// SPDX-License-Identifier: Apache-2.0
using Hiero.TCK.Tests;
using Hiero.TCK.Tests.CryptoService.Params;

using System;
using System.Collections.Generic;

namespace Hiero.TCK.Util
{
    public class JSONRPCParamParser
    {
        public static IList<AllowanceParams>? ParseAllowances(Dictionary<string, object> parameters) 
        {
            return ParseJsonArray(parameters, "allowances", (obj) => new AllowanceParams(obj as Dictionary<string, object>));
        }

        public static IList<CustomFee>? ParseCustomFees(Dictionary<string, object> parameters)
        {
            return ParseJsonArray(parameters, "customFees", (obj) => new CustomFee(obj as Dictionary<string, object>));
        }

        private static IList<T>? ParseJsonArray<T>(Dictionary<string, object> @params, string key, Func<object, T> elementParser) where T : class
        {
            if (!@params.ContainsKey(key))
            {
                return null;
            }

            object jsonArray = @params[key];
            if (jsonArray is IEnumerable<object> array)
            {
                IList<T> results = new List<T>();

                foreach (object o in array)
                {
                    results.Add(elementParser(o));
                }

                return results;
            }

            return null;
        }
    }
}