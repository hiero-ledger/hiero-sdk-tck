import { JSONRPCRequest } from "@services/Client";

export const setOperator = async (
  mochaTestContext: any,
  accountId: string,
  privateKey: string,
) => {
  // sets funding and fee-paying account for CRUD ops
  await JSONRPCRequest(mochaTestContext, "setup", {
    operatorAccountId: accountId,
    operatorPrivateKey: privateKey,
    nodeIp: process.env.NODE_IP,
    nodeAccountId: process.env.NODE_ACCOUNT_ID,
    mirrorNetworkIp: process.env.MIRROR_NETWORK,
  });
};
