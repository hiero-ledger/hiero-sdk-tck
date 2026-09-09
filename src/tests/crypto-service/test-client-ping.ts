import { assert, expect } from "chai";
import { proto } from "@hashgraph/proto";

import { JSONRPCRequest } from "@services/Client";
import { ErrorStatusCodes } from "@enums/error-status-codes";
import { GrpcProxy, decodeQueryCapture } from "@helpers/grpc-proxy";

const GET_ACCOUNT_INFO_PATH = "/proto.CryptoService/getAccountInfo";
const CRYPTO_GET_BALANCE_PATH = "/proto.CryptoService/cryptoGetBalance";

/**
 * Tests for Client.ping() / Client.pingAll() — the COST_ANSWER getAccountInfo
 * node-health probe (AccountBalanceQuery deprecation, Stage 1). The SDK
 * server's consensus endpoint is routed through a capturing gRPC proxy so the
 * tests can assert which query the probe put on the wire; see
 * docs/test-specifications/crypto-service/ClientPing.md.
 */
describe("ClientPing", function () {
  this.timeout(300000);

  let proxy: GrpcProxy;

  before(async function () {
    proxy = await GrpcProxy.start(process.env.NODE_IP as string);
    await JSONRPCRequest(this, "setup", {
      operatorAccountId: process.env.OPERATOR_ACCOUNT_ID,
      operatorPrivateKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
      nodeIp: proxy.address,
      nodeAccountId: process.env.NODE_ACCOUNT_ID,
      mirrorNetworkIp: process.env.MIRROR_NETWORK,
    });
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {});
    await proxy.stop();
  });

  beforeEach(function () {
    proxy.clear();
  });

  // Asserts every captured probe is a COST_ANSWER getAccountInfo for account
  // 0.0.2 and that no cryptoGetBalance query was put on the wire.
  const assertProbeCaptures = () => {
    const probes = proxy.captures.filter(
      (capture) => capture.path === GET_ACCOUNT_INFO_PATH,
    );
    expect(probes).to.not.be.empty;

    for (const probe of probes) {
      const query = decodeQueryCapture(probe);
      expect(query.query).to.equal("cryptoGetInfo");
      expect(query.cryptoGetInfo?.header?.responseType).to.equal(
        proto.ResponseType.COST_ANSWER,
      );
      expect(String(query.cryptoGetInfo?.accountID?.shardNum ?? 0)).to.equal(
        "0",
      );
      expect(String(query.cryptoGetInfo?.accountID?.realmNum ?? 0)).to.equal(
        "0",
      );
      expect(String(query.cryptoGetInfo?.accountID?.accountNum ?? 0)).to.equal(
        "2",
      );
    }

    expect(proxy.captures.map((capture) => capture.path)).to.not.include(
      CRYPTO_GET_BALANCE_PATH,
    );
  };

  const assertInternalError = (error: any) => {
    // Only JSON-RPC error objects carry a numeric code; anything else (e.g.
    // mocha's skip signal) must propagate.
    if (typeof error?.code !== "number") {
      throw error;
    }
    assert.equal(error.code, ErrorStatusCodes.INTERNAL_ERROR, "Internal error");
  };

  describe("Ping", function () {
    it("(#1) Ping a reachable node", async function () {
      const response = await JSONRPCRequest(this, "ping", {
        nodeAccountId: process.env.NODE_ACCOUNT_ID,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Ping sends the COST_ANSWER getAccountInfo probe", async function () {
      await JSONRPCRequest(this, "ping", {
        nodeAccountId: process.env.NODE_ACCOUNT_ID,
      });

      assertProbeCaptures();
    });

    it("(#3) Ping a node that isn't in the network map", async function () {
      try {
        await JSONRPCRequest(this, "ping", {
          nodeAccountId: "1000000.0.0",
        });
      } catch (error: any) {
        assertInternalError(error);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Ping an unreachable node", async function () {
      await proxy.block();

      try {
        await JSONRPCRequest(this, "ping", {
          nodeAccountId: process.env.NODE_ACCOUNT_ID,
        });
      } catch (error: any) {
        assertInternalError(error);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Successful ping resets the node's backoff", async function () {
      await proxy.unblock();

      // The failed probes in test 4 opened a backoff window on the node (and
      // a reconnect backoff inside the SDK's gRPC channel), so recovery is
      // polled: the probe must land again once the endpoint is back. Each
      // failed attempt can burn the SDK server's full 30s request timeout, so
      // the window leaves room for a few of them.
      const deadline = Date.now() + 90000;
      let recovered = false;
      let lastError: any;
      while (Date.now() < deadline) {
        try {
          await JSONRPCRequest(this, "ping", {
            nodeAccountId: process.env.NODE_ACCOUNT_ID,
          });
          recovered = true;
          break;
        } catch (error: any) {
          if (typeof error?.code !== "number") {
            throw error;
          }
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      assert.isTrue(
        recovered,
        `Ping did not recover after the endpoint was unblocked: ${JSON.stringify(lastError)}`,
      );

      // With the backoff reset, an unpinned query goes out immediately — the
      // SDK's node selector, not the test, picks the recovered node — instead
      // of waiting out the window test 4 opened.
      proxy.clear();
      const startedAt = Date.now();
      await JSONRPCRequest(this, "getAccountInfo", {
        accountId: process.env.OPERATOR_ACCOUNT_ID,
      });
      expect(Date.now() - startedAt).to.be.lessThan(3000);

      expect(
        proxy.captures.filter(
          (capture) => capture.path === GET_ACCOUNT_INFO_PATH,
        ),
      ).to.not.be.empty;
    });
  });

  describe("PingAll", function () {
    it("(#1) Ping all nodes", async function () {
      const response = await JSONRPCRequest(this, "pingAll", {});

      expect(response.status).to.equal("SUCCESS");
      assertProbeCaptures();
    });
  });

  return Promise.resolve();
});
