import { JSONRPCRequest } from "@services/Client";

export async function mintToken(
  thisContext: any,
  tokenId: string,
  metadata: string[],
  supplyKey: string,
): Promise<void> {
  await JSONRPCRequest(thisContext, "mintToken", {
    tokenId,
    metadata,
    commonTransactionParams: {
      signers: [supplyKey],
    },
  });
}
