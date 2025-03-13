import { JSONRPC, JSONRPCClient, CreateID } from "json-rpc-2.0";
import axios from "axios";
import "dotenv/config";

import { ErrorStatusCodes } from "@enums/error-status-codes";

let nextID = 0;
const createID: CreateID = () => nextID++;

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

export const JSONRPCRequest = async (
  mochaTestContext: any,
  method: string,
  params?: any,
  expectInternal: boolean = false,
) => {
  const jsonRPCRequest = {
    jsonrpc: JSONRPC,
    id: createID(),
    method: method,
    params: params,
  };
  const maxRetries = 3;
  const retryDelay = 1000;
  let retries = 0;

  while (retries <= maxRetries) {
    const jsonRPCResponse = await JSONRPClient.requestAdvanced(jsonRPCRequest);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (jsonRPCResponse.error) {
      // Method not found - skip the test
      if (mochaTestContext && jsonRPCResponse.error.code === -32601) {
        console.warn("Method", method, "not found.");
        mochaTestContext.skip();
      }

      // For internal errors (-32603), retry if we haven't exceeded max retries and did not expect an internal error
      const shouldRetry =
        jsonRPCResponse.error.code === ErrorStatusCodes.INTERNAL_ERROR &&
        retries < maxRetries &&
        !expectInternal;

      if (shouldRetry) {
        console.warn(
          `Internal error occurred for method ${method}. Retrying (${retries + 1}/${maxRetries})...`,
        );
        retries++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // For all other errors, throw immediately
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
  }

  // If we've exhausted all retries, throw a specific error
  throw {
    name: "Error",
    code: ErrorStatusCodes.INTERNAL_ERROR,
    message: `Internal error persisted after ${maxRetries} retries for method ${method}`,
  };
};
