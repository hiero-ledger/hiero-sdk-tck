import { expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import { GrpcProxy } from "@helpers/grpc-proxy";

const DEPRECATION_MESSAGE = "AccountBalanceQuery is no longer supported";

/**
 * Tests for the Stage 2 AccountBalanceQuery deprecation: constructing the
 * query warns, and executing it (or requesting its cost) fails without any
 * network request. The SDK server's consensus endpoint is routed through a
 * capturing gRPC proxy so the tests can assert nothing reached the wire; see
 * docs/test-specifications/crypto-service/AccountBalanceQuery.md.
 */
describe("AccountBalanceQuery", function () {
  this.timeout(90000);

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

    // Stage 1 gate: the ping probe must work before Stage 2 runs. A server
    // without `ping` skips the suite; a failing ping fails it.
    await JSONRPCRequest(this, "ping", {
      nodeAccountId: process.env.NODE_ACCOUNT_ID,
    });
    // Positive control for the zero-request tests: the probe must have gone
    // through the proxy, or an empty capture would prove nothing.
    expect(proxy.captures, "ping must go through the proxy").to.not.be.empty;
  });

  after(async function () {
    try {
      await JSONRPCRequest(this, "reset", {});
    } finally {
      await proxy.stop();
    }
  });

  beforeEach(function () {
    proxy.clear();
  });

  const executeDeprecatedQuery = (context: Mocha.Context, operation: string) =>
    JSONRPCRequest(context, "executeDeprecatedAccountBalanceQuery", {
      accountId: process.env.OPERATOR_ACCOUNT_ID,
      operation,
    });

  // Every construction must warn (rule 5), so every test checks the warning.
  const expectDeprecationMessage = (value: unknown) =>
    expect(value).to.be.a("string").that.includes(DEPRECATION_MESSAGE);

  // The captures were cleared right before the call; the settle lets a late
  // request reach the proxy before asserting that none was sent.
  const assertNoNetworkRequest = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(proxy.captures.map((capture) => capture.path)).to.be.empty;
  };

  describe("ExecuteDeprecatedAccountBalanceQuery", function () {
    it("(#1) Constructing the query emits the deprecation warning", async function () {
      const response = await executeDeprecatedQuery(this, "execute");

      expectDeprecationMessage(response.constructionWarning);
    });

    it("(#2) Executing the query fails with the deprecation error", async function () {
      const response = await executeDeprecatedQuery(this, "execute");

      expectDeprecationMessage(response.constructionWarning);
      expectDeprecationMessage(response.executionError);
    });

    it("(#3) Executing the query sends no network request", async function () {
      const response = await executeDeprecatedQuery(this, "execute");

      expectDeprecationMessage(response.constructionWarning);
      await assertNoNetworkRequest();
    });

    it("(#4) Requesting the query's cost fails with the deprecation error", async function () {
      const response = await executeDeprecatedQuery(this, "getCost");

      expectDeprecationMessage(response.constructionWarning);
      expectDeprecationMessage(response.executionError);
    });

    it("(#5) Requesting the query's cost sends no network request", async function () {
      const response = await executeDeprecatedQuery(this, "getCost");

      expectDeprecationMessage(response.constructionWarning);
      await assertNoNetworkRequest();
    });
  });

  return Promise.resolve();
});
