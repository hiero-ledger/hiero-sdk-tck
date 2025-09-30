import { JSONRPCRequest } from "@services/Client";

export async function deleteAccount(
  thisContext: any,
  deleteAccountId: string,
  signerAccountPrivateKey: string,
): Promise<void> {
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
  return (
    await JSONRPCRequest(thisContext, "createAccount", { key: privateKey })
  ).accountId;
}
