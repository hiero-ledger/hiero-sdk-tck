import { JSONRPCRequest } from "@services/Client";

export async function deleteAccount(
  thisContext: any,
  deleteAccountId: string,
  signerAccountPrivateKey: string,
): Promise<void> {
  // Retries the request 100 times if failure
  thisContext.retries(100);
  await JSONRPCRequest(thisContext, "deleteAccount", {
    deleteAccountId,
    transferAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
    commonTransactionParams: {
      signers: [signerAccountPrivateKey],
    },
  });
}

export async function createAccount(
  thisContext: any,
  privateKey: string,
): Promise<string> {
  // Retries the request 100 times if failure
  thisContext.retries(100);
  return (
    await JSONRPCRequest(thisContext, "createAccount", { key: privateKey })
  ).accountId;
}
