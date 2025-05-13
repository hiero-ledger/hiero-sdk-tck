import { JSONRPCRequest } from "@services/Client";

import { TokenCreateParams } from "@models/TokenCreate";

/**
 * Creates a fungible token with default settings and optional custom parameters
 * @param thisContext The test context
 * @param params Optional token creation parameters to override defaults
 * @returns The created token ID
 */
export const createFtToken = async (
  thisContext: any,
  params: TokenCreateParams = {},
): Promise<string> => {
  const defaultParams: TokenCreateParams = {
    name: "testname",
    symbol: "testsymbol",
    treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
    tokenType: "ft",
    initialSupply: "1000",
  };

  const mergedParams = { ...defaultParams, ...params };

  return (await JSONRPCRequest(thisContext, "createToken", mergedParams))
    .tokenId;
};

/**
 * Creates an NFT token with default settings and optional custom parameters
 * @param thisContext The test context
 * @param params Optional token creation parameters to override defaults
 * @returns The created token ID
 */
export const createNftToken = async (
  thisContext: any,
  params: TokenCreateParams = {},
): Promise<string> => {
  const defaultParams: TokenCreateParams = {
    name: "testname",
    symbol: "testsymbol",
    treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
    tokenType: "nft",
  };

  const mergedParams = { ...defaultParams, ...params };

  return (await JSONRPCRequest(thisContext, "createToken", mergedParams))
    .tokenId;
};
