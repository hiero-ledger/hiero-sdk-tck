// SPDX-License-Identifier: Apache-2.0
using System;
using System.Collections.Generic;
using System.Reflection;

using Hiero.TCK.Exceptions;

namespace Hiero.TCK.Tests
{
    public abstract class Service  
    {
        private readonly Dictionary<string, MethodInfo> methodMap;
        protected Service()
        {
            methodMap = new Dictionary<string, MethodInfo>();
            RegisterMethods();
        }

        private void RegisterMethods()
        {
            MethodInfo[] methods = GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance);
            foreach (MethodInfo method in methods)
            {
                //if (method.IsDefined(typeof(JSONRPC2Method), inherit: false))
                //{
                //    JSONRPC2Method annotation = method.GetCustomAttribute<JSONRPC2Method>();
                //    methodMap[annotation.Value] = method;
                //}
            }
        }

        
        private object[] GetArguments(MethodInfo method, Dictionary<string, object> parameters)
        {
            ParameterInfo[] paramInfos = method.GetParameters();
            object[] args = new object[paramInfos.Length];
            for (int i = 0; i < paramInfos.Length; i++)
            {
                try
                {
                    var paramType = paramInfos[i].ParameterType;
                    var paramInstance = Activator.CreateInstance(paramType);
                    if (paramInstance is Parameters jsonRpcParam)
                    {
                        //args[i] = jsonRpcParam.Parse(parameters);
                    }
                }
                catch (Exception e)
                {
                    throw new InvalidJSONRPC2ParamsException(string.Format("Invalid parameters for method {0} with args: {1}", method.Name, string.Join(", ", args)));
                }
            }

            return args;
        }
    }
}