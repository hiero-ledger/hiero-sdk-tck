import { JSONRPCRequest } from "@services/Client";

export const setOperator = async (
  mochaTestContext: any,
  accountId: string,
  privateKey: string,
) => {
  // creates or reuses a client for this session with the provided operator
  await JSONRPCRequest(mochaTestContext, "setup", {
    operatorAccountId: accountId,
    operatorPrivateKey: privateKey,
    nodeIp: process.env.NODE_IP,
    nodeAccountId: process.env.NODE_ACCOUNT_ID,
    mirrorNetworkIp: process.env.MIRROR_NETWORK,
  });
};

export const setOperatorForExistingSession = async (
  mochaTestContext: any,
  accountId: string,
  privateKey: string,
) => {
  // updates the operator/payer for the existing session client
  await JSONRPCRequest(mochaTestContext, "setOperator", {
    operatorAccountId: accountId,
    operatorPrivateKey: privateKey,
  });
};
