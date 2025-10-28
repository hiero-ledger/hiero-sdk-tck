import { JSONRPC, JSONRPCClient, CreateID } from "json-rpc-2.0";
import axios from "axios";
import "dotenv/config";

let nextID = 0;
const createID: CreateID = () => nextID++;

// Session management for concurrent test execution
// Maps test context to session IDs to support parallel test suites
const sessionMap = new WeakMap<any, string>();

/**
 * Gets the root suite context from a Mocha test context.
 * The root suite context is consistent across all tests in a file,
 * enabling proper session sharing for file-level parallel execution.
 *
 * @param mochaTestContext - The Mocha test context
 * @returns The root suite context
 */
const getRootSuiteContext = (mochaTestContext: any): any => {
  // In Mocha, the root suite for a file is accessed via mochaTestContext.test.parent
  // We traverse up the hierarchy until we find the root suite
  let current = mochaTestContext.test || mochaTestContext.currentTest;

  if (!current) {
    // If there's no test property, we might be in a hook or suite context
    // In this case, return the context itself
    return mochaTestContext;
  }

  // Traverse up to find the root suite (the one with no parent or parent is root)
  while (current.parent && current.parent.parent) {
    current = current.parent;
  }

  // Return the parent suite object (consistent across all tests in the file)
  return current.parent || current;
};

/**
 * Generates or retrieves a session ID for a given test context.
 * This enables multiple test suites to run in parallel with isolated client instances.
 * Uses the root suite context to ensure all tests in the same file share the same session.
 *
 * @param mochaTestContext - The Mocha test context
 * @returns A unique session ID for this test file
 */
export const getOrCreateSessionId = (mochaTestContext: any): string => {
  const rootContext = getRootSuiteContext(mochaTestContext);

  if (!sessionMap.has(rootContext)) {
    const sessionId = rootContext.suites[0].title;
    sessionMap.set(rootContext, sessionId);
  }
  return sessionMap.get(rootContext)!;
};

// JSONRPCClient needs to know how to send a JSON-RPC request.
// Tell it by passing a function to its constructor. The function must take a JSON-RPC request and send it.
const JSONRPClient = new JSONRPCClient(
  async (jsonRPCRequest): Promise<void> => {
    try {
      const response = await axios.post(
        process.env.JSON_RPC_SERVER_URL ?? "http://localhost:8544",
        jsonRPCRequest,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 200) {
        return JSONRPClient.receive(response.data);
      } else if (jsonRPCRequest.id !== undefined) {
        throw new Error(response.statusText);
      }
    } catch (error) {
      throw error;
    }
  },
  createID,
);

/**
 * Makes a JSON-RPC request to the SDK server with session management support.
 * Each request includes a session ID to enable concurrent test execution with isolated clients.
 *
 * @param mochaTestContext - The Mocha test context (used for session management)
 * @param method - The JSON-RPC method to call
 * @param params - Optional parameters for the method
 * @returns The result from the JSON-RPC server
 */
export const JSONRPCRequest = async (
  mochaTestContext: any,
  method: string,
  params?: any,
) => {
  // Get or create a session ID for this test context
  const sessionId = getOrCreateSessionId(mochaTestContext);
  // Include the session ID in the request params
  const paramsWithSession = {
    ...params,
    sessionId,
  };

  const jsonRPCRequest = {
    jsonrpc: JSONRPC,
    id: createID(),
    method: method,
    params: paramsWithSession,
  };

  const jsonRPCResponse = await JSONRPClient.requestAdvanced(jsonRPCRequest);
  if (jsonRPCResponse.error) {
    if (mochaTestContext && jsonRPCResponse.error.code === -32601) {
      console.warn("Method", method, "not found.");

      mochaTestContext.skip();
    }

    throw { name: "Error", ...jsonRPCResponse.error };
  } else {
    if (
      mochaTestContext &&
      jsonRPCResponse.result.error === "NOT_IMPLEMENTED"
    ) {
      mochaTestContext.skip();
    }
    return jsonRPCResponse.result;
  }
};
