import { JSONRPCRequest } from "@services/Client";

export async function mintToken(
  thisContext: any,
  tokenId: string,
  metadata: string[],
  supplyKey: string,
): Promise<void> {
  // Retries the request 100 times if failure
  thisContext.retries(100);
  await JSONRPCRequest(thisContext, "mintToken", {
    tokenId,
    metadata,
    commonTransactionParams: {
      signers: [supplyKey],
    },
  });
}

export async function getMintedTokenSerialNumber(
  thisContext: any,
  tokenId: string,
  metadata: string[],
  supplyKey: string,
): Promise<string> {
  // Retries the request 100 times if failure
  thisContext.retries(100);
  return (
    await JSONRPCRequest(thisContext, "mintToken", {
      tokenId,
      metadata,
      commonTransactionParams: { signers: [supplyKey] },
    })
  ).serialNumbers[0];
}
