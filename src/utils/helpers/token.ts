import { expect } from "chai";
import consensusInfoClient from "../../services/ConsensusInfoClient";
import mirrorNodeClient from "../../services/MirrorNodeClient";
import { JSONRPCRequest } from "../../services/Client";

/**
 * Verifies that a token has been deleted by checking both the Consensus Info
 * and the Mirror Node API.
 *
 * @async
 * @param {string} tokenId - The ID of the token to verify.
 * @throws {Error} Will throw an error if the token is not marked as deleted in either Consensus Info or Mirror Node.
 */
export const verifyTokenIsDeleted = async (tokenId: string) => {
  expect(await (await consensusInfoClient.getTokenInfo(tokenId)).isDeleted).to
    .be.true;

  expect(await (await mirrorNodeClient.getTokenData(tokenId)).deleted).to.be
    .true;
};

/**
 * Creates a new fungible token via a JSON-RPC request and returns its token ID.
 * @async
 * @param {string} mochaTestContext - The context of the Mocha test. If provided, the test will be skipped if the method is not implemented.
 * @param {string} [adminKey] - The private key of the admin (optional). Defaults to `process.env.OPERATOR_ACCOUNT_PRIVATE_KEY` if not provided.
 * @param {string} [treasuryAccountId] - The account ID of the treasury (optional). Defaults to `process.env.OPERATOR_ACCOUNT_ID` if not provided.
 * @returns {Promise<string>} - The ID of the newly created fungible token.
 */
export const getNewFungibleTokenId = async (
  mochaTestContext: string,
  adminKey: string,
  treasuryAccountId: string,
): Promise<string> => {
  const tokenResponse = await JSONRPCRequest(mochaTestContext, "createToken", {
    name: "testname",
    symbol: "testsymbol",
    adminKey: adminKey || process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    treasuryAccountId: treasuryAccountId || process.env.OPERATOR_ACCOUNT_ID,
  });

  return tokenResponse.tokenId;
};
