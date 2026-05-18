// SPDX-License-Identifier: Apache-2.0
using System;

namespace Hiero.TCK.Exceptions
{
    public class InvalidJSONRPC2ParamsException : Exception
    {
        public InvalidJSONRPC2ParamsException() : base() { }
        public InvalidJSONRPC2ParamsException(string message) : base(message) { }
        public InvalidJSONRPC2ParamsException(Exception innerException) : base(innerException.Message, innerException) { }
        public InvalidJSONRPC2ParamsException(string message, Exception innerException) : base(message, innerException) { }
    }
}