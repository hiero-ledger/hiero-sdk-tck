import { JSONRPCRequest } from "./client.js";

export async function setOperator(accountId, privateKey) {
  // sets funding and fee-paying account for CRUD ops
  await JSONRPCRequest("setup", {
    operatorAccountId: accountId,
    operatorPrivateKey: privateKey,
    nodeIp: process.env.NODE_IP,
    nodeAccountId: process.env.NODE_ACCOUNT_ID,
    mirrorNetworkIp: process.env.MIRROR_NETWORK,
  });
}
