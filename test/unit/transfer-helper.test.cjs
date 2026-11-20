const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const consensus = require("../../src/services/ConsensusInfoClient").default;
const mirror = require("../../src/services/MirrorNodeClient").default;
const { verifyTokenBalance } = require("../../src/utils/helpers/transfer");

const originalConsensus = consensus.getAccountInfo;
const originalMirror = mirror.getAccountData;
after(() => {
  consensus.getAccountInfo = originalConsensus;
  mirror.getAccountData = originalMirror;
});

consensus.getAccountInfo = async () => ({ tokenRelationships: new Map() });

test("mirror balance checks the token before accepting an expected zero", async () => {
  mirror.getAccountData = async () => ({
    balance: {
      tokens: [
        { token_id: "0.0.8", balance: 0 },
        { token_id: "0.0.7", balance: 9 },
      ],
    },
  });
  await assert.rejects(verifyTokenBalance("0.0.2", "0.0.7", 0));
  mirror.getAccountData = async () => ({
    balance: {
      tokens: [
        { token_id: "0.0.8", balance: 9 },
        { token_id: "0.0.7", balance: 0 },
      ],
    },
  });
  await verifyTokenBalance("0.0.2", "0.0.7", 0);
  mirror.getAccountData = async () => ({
    balance: { tokens: [{ token_id: "0.0.8", balance: 9 }] },
  });
  await verifyTokenBalance("0.0.2", "0.0.7", 0);
  await assert.rejects(verifyTokenBalance("0.0.2", "0.0.7", 1));
});

test("mirror balance validates present and absent nonzero values", async () => {
  consensus.getAccountInfo = async () => ({
    tokenRelationships: new Map([
      ["0.0.7", { balance: { toNumber: () => 5 } }],
    ]),
  });
  mirror.getAccountData = async () => ({
    balance: {
      tokens: [
        { token_id: "0.0.8", balance: 9 },
        { token_id: "0.0.7", balance: 5 },
      ],
    },
  });
  await verifyTokenBalance("0.0.2", "0.0.7", 5);
  mirror.getAccountData = async () => ({ balance: { tokens: [] } });
  await assert.rejects(verifyTokenBalance("0.0.2", "0.0.7", 5));
});
