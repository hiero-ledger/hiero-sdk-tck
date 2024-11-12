import { JSONRPC, JSONRPCClient } from "json-rpc-2.0";
import axios from "axios";
import "dotenv/config";

let nextID = 0;
const createID = () => nextID++;

// JSONRPCClient needs to know how to send a JSON-RPC request.
// Tell it by passing a function to its constructor. The function must take a JSON-RPC request and send it.
const JSONRPClient = new JSONRPCClient(async (jsonRPCRequest) => {
  try {
    const response = await axios.post("http://localhost", jsonRPCRequest, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) {
      return JSONRPClient.receive(response.data);
    } else if (jsonRPCRequest.id !== undefined) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    throw error;
  }
}, createID());

export async function JSONRPCRequest(mochaTestContext, method, params) {
  const jsonRPCRequest = {
    jsonrpc: JSONRPC,
    id: createID(),
    method: method,
    params: params,
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
}
