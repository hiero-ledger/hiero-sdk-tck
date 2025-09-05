import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEcdsaSecp256k1PublicKey,
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateKeyList,
} from "@helpers/key";

import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
} from "@constants/key-list";
import { ErrorStatusCodes } from "@enums/error-status-codes";
import { invalidKey } from "@constants/key-type";
import { ServiceEndpoint } from "@hashgraph/sdk";
import { retryOnError } from "@helpers/retry-on-error";
import mirrorNodeClient from "@services/MirrorNodeClient";

/**
 * Tests for NodeUpdateTransaction
 */
describe.only("NodeUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  const nodeId = "0";
  let adminKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    adminKey = process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("NodeId", function () {
    it("(#1) Updates a node with a valid node ID", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#2) Cannot update a node with an invalid node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: "999999",
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_ID", "Invalid node ID");
      }
    });

    it("(#3) Cannot update a node without providing a node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          description: "Test description",
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#4) Cannot update a node with a negative node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: "-1",
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_ID", "Invalid node ID");
      }
    });
  });

  describe("Description", function () {
    it("(#1) Updates a node with a valid description", async function () {
      const description = "Test node description";
      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        console.log(mirrorNodeInfo.nodes[0].description);
      });
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        console.log(mirrorNodeInfo.nodes[0].description, description);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
      });
    });

    it("(#2) Updates a node with a description at maximum length (100 characters)", async function () {
      const description = "A".repeat(100);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
      });
    });

    it("(#3) Cannot update a node with a description exceeding maximum length", async function () {
      const description = "A".repeat(101);

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          description: description,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#4) Updates a node with an empty description", async function () {
      const description = "";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
      });
    });
  });

  describe("GossipEndpoints", function () {
    it("(#1) Updates a node with valid gossip endpoints", async function () {
      const gossipEndpoints = [
        {
          ipAddressV4: "127.0.0.1",
          port: 50211,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#2) Updates a node with multiple valid gossip endpoints", async function () {
      const gossipEndpoints = [
        {
          ipAddressV4: "127.0.0.1",
          port: 50211,
        },
        {
          ipAddressV4: "127.0.0.2",
          port: 50212,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#3) Updates a node with maximum gossip endpoints (10)", async function () {
      const gossipEndpoints = Array.from({ length: 10 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
        port: 50211 + i,
      }));

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#4) Cannot update a node with more than maximum gossip endpoints", async function () {
      const gossipEndpoints = Array.from({ length: 11 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
        port: 50211 + i,
      }));

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipEndpoints: gossipEndpoints,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#5) Cannot update a node with empty gossip endpoints list", async function () {
      const gossipEndpoints: any[] = [];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipEndpoints: gossipEndpoints,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#6) Updates a node with gossip endpoints containing domain names", async function () {
      const gossipEndpoints = [
        {
          domainName: "node1.hedera.com",
          port: 50211,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });
  });

  describe("ServiceEndpoints", function () {
    it("(#1) Updates a node with valid service endpoints", async function () {
      const serviceEndpoints = [
        {
          ipAddressV4: "127.0.0.1",
          port: 50212,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        serviceEndpoints: serviceEndpoints,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].service_endpoints).to.equal(
          serviceEndpoints,
        );
      });
    });

    it("(#2) Updates a node with multiple valid service endpoints", async function () {
      const serviceEndpoints = [
        {
          ipAddressV4: "127.0.0.1",
          port: 50212,
        },
        {
          ipAddressV4: "127.0.0.2",
          port: 50213,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        serviceEndpoints: serviceEndpoints,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#3) Updates a node with maximum service endpoints (8)", async function () {
      const serviceEndpoints = Array.from({ length: 8 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
        port: 50212 + i,
      }));

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        serviceEndpoints: serviceEndpoints,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#4) Cannot update a node with more than maximum service endpoints", async function () {
      const serviceEndpoints = Array.from({ length: 9 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
        port: 50212 + i,
      }));

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#5) Cannot update a node with empty service endpoints list", async function () {
      const serviceEndpoints: any[] = [];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#6) Updates a node with service endpoints containing domain names", async function () {
      const serviceEndpoints = [
        {
          domainName: "grpc.hedera.com",
          port: 443,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        serviceEndpoints: serviceEndpoints,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });
  });

  describe("GossipCaCertificate", function () {
    it("(#1) Updates a node with a valid gossip CA certificate", async function () {
      // Mock DER-encoded certificate as hex string
      const gossipCaCertificate =
        "308201a230820109a003020102020101300d06092a864886f70d01010b0500";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipCaCertificate: gossipCaCertificate,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#2) Cannot update a node with an empty gossip CA certificate", async function () {
      const gossipCaCertificate = "";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipCaCertificate: gossipCaCertificate,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#3) Cannot update a node with an invalid gossip CA certificate format", async function () {
      const gossipCaCertificate = "invalid_certificate_format";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipCaCertificate: gossipCaCertificate,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });
  });

  describe("GrpcCertificateHash", function () {
    it("(#1) Updates a node with a valid gRPC certificate hash", async function () {
      // Mock SHA-384 hash as hex string (48 bytes = 96 hex characters)
      const grpcCertificateHash = "a".repeat(96);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcCertificateHash: grpcCertificateHash,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#2) Updates a node with an empty gRPC certificate hash", async function () {
      const grpcCertificateHash = "";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcCertificateHash: grpcCertificateHash,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#3) Cannot update a node with an invalid gRPC certificate hash format", async function () {
      const grpcCertificateHash = "invalid_hash_format";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          grpcCertificateHash: grpcCertificateHash,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });
  });

  describe("GrpcWebProxyEndpoint", function () {
    it("(#1) Updates a node with a valid gRPC web proxy endpoint", async function () {
      const grpcWebProxyEndpoint = {
        ipAddressV4: "127.0.0.1",
        port: 8080,
      };

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcWebProxyEndpoint: grpcWebProxyEndpoint,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].grpc_proxy_endpoint).to.equal(
          grpcWebProxyEndpoint,
        );
      });
    });

    it("(#2) Updates a node with a gRPC web proxy endpoint using domain name", async function () {
      const grpcWebProxyEndpoint = {
        domainName: "proxy.hedera.com",
        port: 443,
      };

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcWebProxyEndpoint: grpcWebProxyEndpoint,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#3) Deletes a gRPC web proxy endpoint", async function () {
      // Empty endpoint should delete the proxy endpoint
      const grpcWebProxyEndpoint = {};

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcWebProxyEndpoint: grpcWebProxyEndpoint,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });
  });

  describe("AdminKey", function () {
    it("(#1) Updates a node with a valid ED25519 admin key", async function () {
      const adminKeyValue = await generateEd25519PublicKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKeyValue,
        commonTransactionParams: {
          signers: [adminKey, adminKeyValue],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].admin_key).to.equal(adminKeyValue);
      });
    });

    it("(#2) Updates a node with a valid ECDSA secp256k1 admin key", async function () {
      const adminKeyValue = await generateEcdsaSecp256k1PublicKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKeyValue,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#3) Updates a node with a valid ED25519 private key as admin key", async function () {
      const adminKeyValue = await generateEd25519PrivateKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKeyValue,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#4) Updates a node with a valid ECDSA secp256k1 private key as admin key", async function () {
      const adminKeyValue = await generateEcdsaSecp256k1PrivateKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKeyValue,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#5) Updates a node with a valid KeyList as admin key", async function () {
      const keyList = await generateKeyList(this, fourKeysKeyListParams);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: keyList,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#6) Updates a node with a valid nested KeyList as admin key", async function () {
      const nestedKeyList = await generateKeyList(
        this,
        twoLevelsNestedKeyListParams,
      );

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: nestedKeyList,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
      });
    });

    it("(#7) Cannot update a node with an invalid admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          adminKey: invalidKey,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });
  });

  describe.only("DeclineReward", function () {
    it.only("(#1) Updates a node with declineReward set to true", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        declineReward: true,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].decline_reward).to.equal(true);
      });
    });

    it.only("(#2) Updates a node with declineReward set to false", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        declineReward: false,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].decline_reward).to.equal(false);
      });
    });
  });

  describe("Complex Scenarios", function () {
    it("(#1) Updates a node with all valid parameters", async function () {
      const description = "Complete node update test";
      const gossipEndpoints = [
        {
          ipAddressV4: "127.0.0.1",
          port: 50211,
        },
      ];
      const serviceEndpoints = [
        {
          ipAddressV4: "127.0.0.1",
          port: 50212,
        },
      ];
      const gossipCaCertificate =
        "308201a230820109a003020102020101300d06092a864886f70d01010b0500";
      const grpcCertificateHash = "a".repeat(96);
      const grpcWebProxyEndpoint = {
        ipAddressV4: "127.0.0.1",
        port: 8080,
      };
      const adminKeyValue = await generateEd25519PublicKey(this);
      const declineReward = false;

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
        gossipEndpoints: gossipEndpoints,
        serviceEndpoints: serviceEndpoints,
        gossipCaCertificate: gossipCaCertificate,
        grpcCertificateHash: grpcCertificateHash,
        grpcWebProxyEndpoint: grpcWebProxyEndpoint,
        adminKey: adminKeyValue,
        declineReward: declineReward,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
        expect(mirrorNodeInfo.nodes[0].decline_reward).to.equal(declineReward);
      });
    });

    it("(#2) Updates a node with minimal valid parameters", async function () {
      const description = "Minimal update";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
      });
    });

    it("(#3) Cannot update a node with multiple invalid parameters", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: "-1",
          accountId: "invalid.account.id",
          description: "A".repeat(101),
          gossipEndpoints: [],
          serviceEndpoints: [],
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });
  });

  describe("Common Transaction Parameters", function () {
    it("(#1) Updates a node with common transaction parameters", async function () {
      const description = "Test with common params";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
        commonTransactionParams: {
          maxTransactionFee: "100000000",
          transactionValidDuration: "120",
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
      });
    });

    it("(#2) Updates a node with signers in common transaction parameters", async function () {
      const description = "Test with signers";
      const adminKeyValue = await generateEd25519PrivateKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
        adminKey: adminKeyValue,
        commonTransactionParams: {
          signers: [adminKeyValue],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNodeData(nodeId);
        expect(response.status).to.equal("SUCCESS");
        expect(mirrorNodeInfo.nodes[0].node_id).to.equal(Number(nodeId));
        expect(mirrorNodeInfo.nodes[0].description).to.equal(description);
      });
    });
  });
});
