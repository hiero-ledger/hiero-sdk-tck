const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");
const consensus = require("../../src/services/ConsensusInfoClient").default;
const mirror = require("../../src/services/MirrorNodeClient").default;
const { verifyTokenBalance } = require("../../src/utils/helpers/transfer");

const originalConsensus = consensus.getAccountInfo;
const originalMirror = mirror.getAccountData;
after(() => {
  consensus.getAccountInfo = originalConsensus;
  mirror.getAccountData = originalMirror;
});

const source = ts.createSourceFile(
  "airdrop.ts",
  readFileSync(
    join(
      __dirname,
      "../../src/tests/token-service/test-token-airdrop-transaction.ts",
    ),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
);

async function runScenario(number, balances, mirrorBalances = balances) {
  let callback;
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith(
        `(#${number}) Airdrops an amount of fungible token from several sender accounts`,
      ) &&
      node.arguments[0].text.endsWith("no automatic token associations")
    ) {
      assert.equal(node.expression.getText(source), "it.skip");
      assert.equal(callback, undefined, "Scenario must be unique");
      callback = node.arguments[1].getText(source);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback, `Missing pending-airdrop scenario ${number}`);

  const tokenId = "0.0.7";
  const accountIds = ["sender1", "sender2", "sender3"];
  const balanceFor = (id, values) => {
    const index = accountIds.indexOf(id);
    return index === -1 ? (id === "receiver1" ? 5 : 15) : values[index];
  };
  consensus.getAccountInfo = async (id) => ({
    tokenRelationships: new Map([
      [tokenId, { balance: { toNumber: () => balanceFor(id, balances) } }],
    ]),
  });
  mirror.getAccountData = async (id) => ({
    balance: {
      tokens: [
        {
          token_id: tokenId,
          balance:
            number === 34 && id === "receiver1"
              ? 0
              : balanceFor(id, mirrorBalances),
        },
      ],
    },
  });
  if (number === 34) {
    const getAccountInfo = consensus.getAccountInfo;
    consensus.getAccountInfo = async (id) =>
      id === "receiver1"
        ? { tokenRelationships: new Map() }
        : getAccountInfo(id);
  }

  const compiled = ts.transpileModule(`exports.run = ${callback};`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText;
  const exports = {};
  const newIds = ["sender2", "sender3", "receiver2", "receiver3"];
  runInNewContext(compiled, {
    exports,
    assert,
    process: { env: { OPERATOR_ACCOUNT_ID: "operator" } },
    amount: 10,
    amountStr: "10",
    amountNegatedStr: "-10",
    senderAccountId: "sender1",
    senderPrivateKey: "unused",
    receiverAccountId: "receiver1",
    receiverPrivateKey: "unused",
    tokenId,
    ConsensusInfoClient: consensus,
    verifyTokenBalance,
    verifyAirdrop: async () => {},
    retryOnError: (fn) => fn(),
    generateEcdsaSecp256k1PrivateKey: async () => "unused",
    generateEd25519PrivateKey: async () => "unused",
    JSONRPCRequest: async (_context, method) =>
      method === "createAccount" ? { accountId: newIds.shift() } : {},
  });
  await exports.run.call({});
}

test("all-pending airdrops retain every sender's balance", async () => {
  await runScenario(34, [10, 10, 10]);
  await assert.rejects(runScenario(34, [0, 0, 0]), { name: "AssertionError" });
});

test("partly pending airdrops retain the pending total without assuming allocation", async () => {
  for (const balances of [
    [10, 0, 0],
    [0, 10, 0],
    [0, 0, 10],
    [2, 3, 5],
  ]) {
    await runScenario(39, balances);
  }
  await assert.rejects(runScenario(39, [0, 0, 0]), { name: "AssertionError" });
  await assert.rejects(runScenario(39, [10, 10, 10]), {
    name: "AssertionError",
  });
});

test("aggregate balance checks still require matching mirror balances", async () => {
  await assert.rejects(runScenario(39, [0, 0, 10], [0, 0, 0]), {
    name: "AssertionError",
  });
});
