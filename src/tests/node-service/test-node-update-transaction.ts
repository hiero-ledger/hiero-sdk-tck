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

import { twoLevelsNestedKeyListParams } from "@constants/key-list";
import { ErrorStatusCodes } from "@enums/error-status-codes";
import { invalidKey } from "@constants/key-type";
import { toHexString } from "@helpers/verify-contract-tx";
/**
 * Tests for NodeUpdateTransaction
 */
describe("NodeUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  let adminKey: string;
  let ipAddressV4: string;
  let nodeId: string;

  const validGossipCertDER =
    "3082052830820310a003020102020101300d06092a864886f70d01010c05003010310e300c060355040313056e6f6465333024170d3234313030383134333233395a181332313234313030383134333233392e3337395a3010310e300c060355040313056e6f64653330820222300d06092a864886f70d01010105000382020f003082020a0282020100af111cff0c4ad8125d2f4b8691ce87332fecc867f7a94ddc0f3f96514cc4224d44af516394f7384c1ef0a515d29aa6116b65bc7e4d7e2d848cf79fbfffedae3a6583b3957a438bdd780c4981b800676ea509bc8c619ae04093b5fc642c4484152f0e8bcaabf19eae025b630028d183a2f47caf6d9f1075efb30a4248679d871beef1b7e9115382270cbdb68682fae4b1fd592cadb414d918c0a8c23795c7c5a91e22b3e90c410825a2bc1a840efc5bf9976a7f474c7ed7dc047e4ddd2db631b68bb4475f173baa3edc234c4bed79c83e2f826f79e07d0aade2d984da447a8514135bfa4145274a7f62959a23c4f0fae5adc6855974e7c04164951d052beb5d45cb1f3cdfd005da894dea9151cb62ba43f4731c6bb0c83e10fd842763ba6844ef499f71bc67fa13e4917fb39f2ad18112170d31cdcb3c61c9e3253accf703dbd8427fdcb87ece78b787b6cfdc091e8fedea8ad95dc64074e1fc6d0e42ea2337e18a5e54e4aaab3791a98dfcef282e2ae1caec9cf986fabe8f36e6a21c8711647177e492d264415e765a86c58599cd97b103cb4f6a01d2edd06e3b60470cf64daca7aecf831197b466cae04baeeac19840a05394bef628aed04b611cfa13677724b08ddfd662b02fd0ef0af17eb7f4fb8c1c17fbe9324f6dc7bcc02449622636cc45ec04909b3120ab4df4726b21bf79e955fe8f832699d2196dcd7a58bfeafb170203010001a38186308183300f0603551d130101ff04053003020100300e0603551d0f0101ff0404030204b030200603551d250101ff0416301406082b0601050507030106082b06010505070302301d0603551d0e04160414643118e05209035edd83d44a0c368de2fb2fe4c0301f0603551d23041830168014643118e05209035edd83d44a0c368de2fb2fe4c0300d06092a864886f70d01010c05000382020100ad41c32bb52650eb4b76fce439c9404e84e4538a94916b3dc7983e8b5c58890556e7384601ca7440dde68233bb07b97bf879b64487b447df510897d2a0a4e789c409a9b237a6ad240ad5464f2ce80c58ddc4d07a29a74eb25e1223db6c00e334d7a27d32bfa6183a82f5e35bccf497c2445a526eabb0c068aba9b94cc092ea4756b0dcfb574f6179f0089e52b174ccdbd04123eeb6d70daeabd8513fcba6be0bc2b45ca9a69802dae11cc4d9ff6053b3a87fd8b0c6bf72fffc3b81167f73cca2b3fd656c5d353c8defca8a76e2ad535f984870a590af4e28fed5c5a125bf360747c5e7742e7813d1bd39b5498c8eb6ba72f267eda034314fdbc596f6b967a0ef8be5231d364e634444c84e64bd7919425171016fcd9bb05f01c58a303dee28241f6e860fc3aac3d92aad7dac2801ce79a3b41a0e1f1509fc0d86e96d94edb18616c000152490f64561713102128990fedd3a5fa642f2ff22dc11bc4dc5b209986a0c3e4eb2bdfdd40e9fdf246f702441cac058dd8d0d51eb0796e2bea2ce1b37b2a2f468505e1f8980a9f66d719df034a6fbbd2f9585991d259678fb9a4aebdc465d22c240351ed44abffbdd11b79a706fdf7c40158d3da87f68d7bd557191a8016b5b899c07bf1b87590feb4fa4203feea9a2a7a73ec224813a12b7a21e5dc93fcde4f0a7620f570d31fe27e9b8d65b74db7dc18a5e51adc42d7805d4661938";

  const validAccountId = "0.0.4";

  const ipv4Address = toHexString(new Uint8Array([127, 0, 0, 1]));
  const createNodeRequiredFields = {
    gossipEndpoints: [
      {
        ipAddressV4: ipv4Address,
        port: 50211,
      },
    ],
    serviceEndpoints: [
      {
        ipAddressV4: ipv4Address,
        port: 50211,
      },
    ],
    gossipCaCertificate: validGossipCertDER,
  };

  const createNode = async (context: any) => {
    adminKey = process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string;
    ipAddressV4 = toHexString(new Uint8Array([127, 0, 0, 1]));

    const responseCreateNode = await JSONRPCRequest(context, "createNode", {
      accountId: validAccountId,
      ...createNodeRequiredFields,
      adminKey: adminKey,
      commonTransactionParams: {
        signers: [adminKey],
      },
    });

    nodeId = responseCreateNode.nodeId;
  };

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    if (!nodeId) {
      await createNode(this);
    }
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("NodeId", function () {
    it("(#1) Updates a node with a valid node ID", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: "Test description",
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Cannot update a node with an invalid node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: "99999",
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_ID");
      }
    });

    it("(#3) Cannot update a node without providing a node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          description: "Test description",
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
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#5) Cannot update a node with uint64 max node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: "18446744073709551615",
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_ID");
      }
    });
  });

  describe("AccountId", function () {
    it("(#1) Updates a node with a valid account ID", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        accountId: validAccountId,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Fails with empty account ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          accountId: "",
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

    it("(#3) Fails with non-existent account ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          accountId: "123.456.789",
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_ACCOUNT_ID");
      }
    });

    it("(#4) Fails with invalid account ID", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          accountId: "invalid.account.id",
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

  describe("Description", function () {
    it("(#1) Updates a node with a valid description", async function () {
      const description = "Test node description";
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a node with a description at maximum length (100 characters)", async function () {
      const description = "A".repeat(100);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Cannot update a node with a description exceeding maximum length", async function () {
      const description = "A".repeat(101);

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          description: description,
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

    it("(#4) Updates a node with a description containing only whitespace", async function () {
      const description = " ";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#5) Updates a node with description containing special characters", async function () {
      const description = "!@#$%^&*()_+-=[]{};':\",./<>?";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#6) Updates a node with description containing unicode characters", async function () {
      const description = "测试节点描述 🚀";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#7) Updates a node with description exactly 100 ASCII characters", async function () {
      const description = "a".repeat(100);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#8) Updates a node with description containing exactly 100 UTF-8 bytes", async function () {
      const description = "🚀".repeat(25);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        description: description,
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });

  describe("GossipEndpoints", function () {
    it("(#1) Updates a node with valid gossip endpoints", async function () {
      const gossipEndpoints = [
        {
          ipAddressV4,
          port: 50211,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a node with gossip endpoints containing domain names", async function () {
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

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Updates a node with multiple valid gossip endpoints", async function () {
      const ipv4Address2 = toHexString(new Uint8Array([127, 0, 0, 2]));
      const gossipEndpoints = [
        {
          ipAddressV4,
          port: 50211,
        },
        {
          ipAddressV4: ipv4Address2,
          port: 50212,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#4) Updates a node with maximum gossip endpoints (10)", async function () {
      const gossipEndpoints = Array.from({ length: 10 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
        port: 50211 + i,
      }));

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipEndpoints: gossipEndpoints,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#5) Cannot update a node with more than maximum gossip endpoints", async function () {
      const gossipEndpoints = Array.from({ length: 11 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
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

    it("(#6) Cannot update a node with empty gossip endpoints list", async function () {
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

    it("(#7) Fails with missing port in endpoint", async function () {
      const gossipEndpoints: any = [
        {
          ipAddressV4,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipEndpoints: gossipEndpoints,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ENDPOINT", "Invalid endpoint");
      }
    });

    it("(#8) Fails with both IP and domain in same endpoint", async function () {
      const gossipEndpoints: any = [
        {
          ipAddressV4,
          domainName: "node.example.com",
          port: 50211,
        },
      ];

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

    it("(#9) Fails with invalid IP address format", async function () {
      const gossipEndpoints: any = [
        {
          ipAddressV4: toHexString(new Uint8Array([192, 168, 1])),
          port: 50211,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipEndpoints: gossipEndpoints,
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_IPV4_ADDRESS",
          "Invalid IP address",
        );
      }
    });

    // TODO: need to fix in services
    it.skip("(#10) Fails with invalid port number (negative)", async function () {
      const gossipEndpoints: any = [
        {
          ipAddressV4,
          port: -1,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipEndpoints: gossipEndpoints,
          adminKey: adminKey,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ENDPOINT", "Invalid endpoint");
      }
    });

    // TODO: need to fix in services
    it.skip("(#11) Fails with invalid port number (too high)", async function () {
      const gossipEndpoints: any = [
        {
          ipAddressV4,
          port: 65536,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipEndpoints: gossipEndpoints,
          adminKey: adminKey,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ENDPOINT", "Invalid endpoint");
      }
    });
  });

  describe("ServiceEndpoints", function () {
    it("(#1) Updates a node with valid service endpoints", async function () {
      const serviceEndpoints = [
        {
          ipAddressV4,
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

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a node with multiple valid service endpoints", async function () {
      const ipv4Address2 = toHexString(new Uint8Array([127, 0, 0, 2]));
      const serviceEndpoints = [
        {
          ipAddressV4,
          port: 50212,
        },
        {
          ipAddressV4: ipv4Address2,
          port: 50213,
        },
      ];

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        serviceEndpoints: serviceEndpoints,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Updates a node with maximum service endpoints (8)", async function () {
      const serviceEndpoints = Array.from({ length: 8 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
        port: 50212 + i,
      }));

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        serviceEndpoints: serviceEndpoints,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
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

    it("(#5) Cannot update a node with empty service endpoints list", async function () {
      const serviceEndpoints: any[] = [];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
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
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#7) Fails with invalid service endpoint (missing port)", async function () {
      const serviceEndpoints: any = [
        {
          ipAddressV4,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ENDPOINT", "Invalid endpoint");
      }
    });

    it("(#8) Fails with both IP and domain in same service endpoint", async function () {
      const serviceEndpoints: any = [
        {
          ipAddressV4,
          domainName: "service.example.com",
          port: 50212,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
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

    it("(#9) Fails with invalid IP address format in service endpoint", async function () {
      const serviceEndpoints: any = [
        {
          ipAddressV4: toHexString(new Uint8Array([192, 168, 1])),
          port: 50212,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_IPV4_ADDRESS",
          "Invalid IP address",
        );
      }
    });

    // TODO: need to fix in services
    it.skip("(#10) Fails with invalid port number (negative) in service endpoint", async function () {
      const serviceEndpoints: any = [
        {
          ipAddressV4,
          port: -1,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
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

    // TODO: need to fix in services
    it.skip("(#11) Fails with invalid port number (too high) in service endpoint", async function () {
      const serviceEndpoints: any = [
        {
          ipAddressV4,
          port: 65536,
        },
      ];

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          serviceEndpoints: serviceEndpoints,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ENDPOINT", "Invalid endpoint");
      }
    });
  });

  describe("GossipCaCertificate", function () {
    it("(#1) Updates a node with a valid gossip CA certificate", async function () {
      // Mock DER-encoded certificate as hex string
      const gossipCaCertificate =
        "3082052830820310a003020102020101300d06092a864886f70d01010c05003010310e300c060355040313056e6f6465333024170d3234313030383134333233395a181332313234313030383134333233392e3337395a3010310e300c060355040313056e6f64653330820222300d06092a864886f70d01010105000382020f003082020a0282020100af111cff0c4ad8125d2f4b8691ce87332fecc867f7a94ddc0f3f96514cc4224d44af516394f7384c1ef0a515d29aa6116b65bc7e4d7e2d848cf79fbfffedae3a6583b3957a438bdd780c4981b800676ea509bc8c619ae04093b5fc642c4484152f0e8bcaabf19eae025b630028d183a2f47caf6d9f1075efb30a4248679d871beef1b7e9115382270cbdb68682fae4b1fd592cadb414d918c0a8c23795c7c5a91e22b3e90c410825a2bc1a840efc5bf9976a7f474c7ed7dc047e4ddd2db631b68bb4475f173baa3edc234c4bed79c83e2f826f79e07d0aade2d984da447a8514135bfa4145274a7f62959a23c4f0fae5adc6855974e7c04164951d052beb5d45cb1f3cdfd005da894dea9151cb62ba43f4731c6bb0c83e10fd842763ba6844ef499f71bc67fa13e4917fb39f2ad18112170d31cdcb3c61c9e3253accf703dbd8427fdcb87ece78b787b6cfdc091e8fedea8ad95dc64074e1fc6d0e42ea2337e18a5e54e4aaab3791a98dfcef282e2ae1caec9cf986fabe8f36e6a21c8711647177e492d264415e765a86c58599cd97b103cb4f6a01d2edd06e3b60470cf64daca7aecf831197b466cae04baeeac19840a05394bef628aed04b611cfa13677724b08ddfd662b02fd0ef0af17eb7f4fb8c1c17fbe9324f6dc7bcc02449622636cc45ec04909b3120ab4df4726b21bf79e955fe8f832699d2196dcd7a58bfeafb170203010001a38186308183300f0603551d130101ff04053003020100300e0603551d0f0101ff0404030204b030200603551d250101ff0416301406082b0601050507030106082b06010505070302301d0603551d0e04160414643118e05209035edd83d44a0c368de2fb2fe4c0301f0603551d23041830168014643118e05209035edd83d44a0c368de2fb2fe4c0300d06092a864886f70d01010c05000382020100ad41c32bb52650eb4b76fce439c9404e84e4538a94916b3dc7983e8b5c58890556e7384601ca7440dde68233bb07b97bf879b64487b447df510897d2a0a4e789c409a9b237a6ad240ad5464f2ce80c58ddc4d07a29a74eb25e1223db6c00e334d7a27d32bfa6183a82f5e35bccf497c2445a526eabb0c068aba9b94cc092ea4756b0dcfb574f6179f0089e52b174ccdbd04123eeb6d70daeabd8513fcba6be0bc2b45ca9a69802dae11cc4d9ff6053b3a87fd8b0c6bf72fffc3b81167f73cca2b3fd656c5d353c8defca8a76e2ad535f984870a590af4e28fed5c5a125bf360747c5e7742e7813d1bd39b5498c8eb6ba72f267eda034314fdbc596f6b967a0ef8be5231d364e634444c84e64bd7919425171016fcd9bb05f01c58a303dee28241f6e860fc3aac3d92aad7dac2801ce79a3b41a0e1f1509fc0d86e96d94edb18616c000152490f64561713102128990fedd3a5fa642f2ff22dc11bc4dc5b209986a0c3e4eb2bdfdd40e9fdf246f702441cac058dd8d0d51eb0796e2bea2ce1b37b2a2f468505e1f8980a9f66d719df034a6fbbd2f9585991d259678fb9a4aebdc465d22c240351ed44abffbdd11b79a706fdf7c40158d3da87f68d7bd557191a8016b5b899c07bf1b87590feb4fa4203feea9a2a7a73ec224813a12b7a21e5dc93fcde4f0a7620f570d31fe27e9b8d65b74db7dc18a5e51adc42d7805d4661938";

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        gossipCaCertificate: gossipCaCertificate,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Cannot update a node with an empty gossip CA certificate", async function () {
      const gossipCaCertificate = "";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipCaCertificate: gossipCaCertificate,
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

    it("(#3) Cannot update a node with an invalid gossip CA certificate format", async function () {
      const gossipCaCertificate = "invalid_certificate_format";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipCaCertificate: gossipCaCertificate,
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

    it("(#4) Fails with malformed hex string", async function () {
      const gossipCaCertificate = "not_hex_string";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          gossipCaCertificate: gossipCaCertificate,
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
  });

  describe("GrpcCertificateHash", function () {
    it("(#1) Updates a node with a valid gRPC certificate hash", async function () {
      // Mock SHA-384 hash as hex string (48 bytes = 96 hex characters)
      const grpcCertificateHash = "a".repeat(96);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcCertificateHash: grpcCertificateHash,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Fails with empty gRPC certificate hash", async function () {
      const grpcCertificateHash = "";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          grpcCertificateHash: grpcCertificateHash,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_GRPC_CERTIFICATE_HASH",
          "Invalid gRPC certificate hash",
        );
      }
    });

    it("(#3) Cannot update a node with an invalid gRPC certificate hash format", async function () {
      const grpcCertificateHash = "invalid_hash_format";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          grpcCertificateHash: grpcCertificateHash,
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

    it("(#4) Fails with malformed hex string", async function () {
      const grpcCertificateHash = "not_hex_string";

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          grpcCertificateHash: grpcCertificateHash,
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
  });

  describe("GrpcWebProxyEndpoint", function () {
    it("(#1) Updates a node with a valid gRPC web proxy endpoint", async function () {
      const grpcWebProxyEndpoint = {
        ipAddressV4,
        port: 50211,
      };

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          grpcWebProxyEndpoint: grpcWebProxyEndpoint,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SERVICE_ENDPOINT",
          "Invalid service endpoint",
        );
      }
    });

    it("(#2) Updates a node with a gRPC web proxy endpoint using domain name", async function () {
      const grpcWebProxyEndpoint = {
        domainName: "proxy.hedera.com",
        port: 443,
      };

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcWebProxyEndpoint: grpcWebProxyEndpoint,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Deletes a gRPC web proxy endpoint", async function () {
      // Empty endpoint should delete the proxy endpoint
      const grpcWebProxyEndpoint = {};

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        grpcWebProxyEndpoint: grpcWebProxyEndpoint,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });

  describe("AdminKey", function () {
    beforeEach(async function () {
      await createNode(this);
    });

    afterEach(async function () {
      nodeId = null as any;
    });

    it("(#1) Updates a node with a valid ED25519 public key as admin key", async function () {
      const newPrivateKey = await generateEd25519PrivateKey(this);
      const newPublicKey = await generateEd25519PublicKey(this, newPrivateKey);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: newPublicKey,
        commonTransactionParams: {
          signers: [adminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a node with a valid ECDSAsecp256k1 public key as admin key", async function () {
      const newPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const newPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        newPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: newPublicKey,
        commonTransactionParams: {
          signers: [adminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Updates a node with a valid ED25519 private key as admin key", async function () {
      const newPrivateKey = await generateEd25519PrivateKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: newPrivateKey,
        commonTransactionParams: {
          signers: [adminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#4) Updates a node with a valid ECDSAsecp256k1 private key as admin key", async function () {
      const newPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: newPrivateKey,
        commonTransactionParams: {
          signers: [adminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#5) Updates a node with a valid KeyList as admin key", async function () {
      const keyList = await generateKeyList(this, {
        type: "keyList",
        keys: [
          { type: "ed25519PublicKey" },
          { type: "ecdsaSecp256k1PublicKey" },
          { type: "ecdsaSecp256k1PrivateKey" },
        ],
      });

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: keyList.key,
        commonTransactionParams: {
          signers: [adminKey, ...keyList.privateKeys],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#6) Updates a node with a valid nested KeyList as admin key", async function () {
      const nestedKeyList = await generateKeyList(
        this,
        twoLevelsNestedKeyListParams,
      );

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [adminKey, ...nestedKeyList.privateKeys],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#7) Updates the admin key of a node to a new valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      const thresholdKey = await generateKeyList(this, {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          { type: "ed25519PublicKey" },
          { type: "ecdsaSecp256k1PublicKey" },
          { type: "ecdsaSecp256k1PrivateKey" },
        ],
      });

      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [adminKey, ...thresholdKey.privateKeys],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#8) Fails with valid admin key without signing with the new key", async function () {
      const newAdminPrivateKey = await generateEd25519PrivateKey(this);
      const newAdminKey = await generateEd25519PublicKey(
        this,
        newAdminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          adminKey: newAdminKey,
          commonTransactionParams: {
            signers: [adminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SIGNATURE",
          "Invalid signature error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Cannot update a node with an invalid admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateNode", {
          nodeId: nodeId,
          adminKey: invalidKey,
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
  });

  describe("DeclineReward", function () {
    it("(#1) Updates a node that accepts rewards (default)", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a node with declineReward set to true", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKey,
        declineReward: true,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Updates a node with declineReward set to false", async function () {
      const response = await JSONRPCRequest(this, "updateNode", {
        nodeId: nodeId,
        adminKey: adminKey,
        declineReward: false,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });
});
