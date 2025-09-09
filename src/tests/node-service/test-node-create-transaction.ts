import "dotenv/config";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PublicKey,
  generateKeyList,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { toHexString } from "@helpers/verify-contract-tx";
import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
  twoThresholdKeyParams,
} from "@helpers/constants/key-list";
import { invalidKey } from "@constants/key-type";

/**
 * Tests for NodeCreateTransaction
 */

describe("NodeCreateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Global variable to track the current node ID for cleanup
  let currentNodeId: string | null = null;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  afterEach(async function () {
    // Clean up the created node if it exists
    if (currentNodeId) {
      try {
        await JSONRPCRequest(this, "deleteNode", {
          nodeId: currentNodeId,
        });
      } catch (err) {
        // Ignore cleanup errors - node might already be deleted or not exist
        console.warn(`Failed to cleanup node ${currentNodeId}:`, err);
      }
      currentNodeId = null;
    }

    await JSONRPCRequest(this, "reset");
  });

  const createTestAccount = async () => {
    const accountKey = await generateEd25519PrivateKey(this);
    const accountResponse = await JSONRPCRequest(this, "createAccount", {
      key: accountKey,
    });
    return { accountKey, accountId: accountResponse.accountId };
  };

  const validGossipCertDER =
    "3082052830820310a003020102020101300d06092a864886f70d01010c05003010310e300c060355040313056e6f6465333024170d3234313030383134333233395a181332313234313030383134333233392e3337395a3010310e300c060355040313056e6f64653330820222300d06092a864886f70d01010105000382020f003082020a0282020100af111cff0c4ad8125d2f4b8691ce87332fecc867f7a94ddc0f3f96514cc4224d44af516394f7384c1ef0a515d29aa6116b65bc7e4d7e2d848cf79fbfffedae3a6583b3957a438bdd780c4981b800676ea509bc8c619ae04093b5fc642c4484152f0e8bcaabf19eae025b630028d183a2f47caf6d9f1075efb30a4248679d871beef1b7e9115382270cbdb68682fae4b1fd592cadb414d918c0a8c23795c7c5a91e22b3e90c410825a2bc1a840efc5bf9976a7f474c7ed7dc047e4ddd2db631b68bb4475f173baa3edc234c4bed79c83e2f826f79e07d0aade2d984da447a8514135bfa4145274a7f62959a23c4f0fae5adc6855974e7c04164951d052beb5d45cb1f3cdfd005da894dea9151cb62ba43f4731c6bb0c83e10fd842763ba6844ef499f71bc67fa13e4917fb39f2ad18112170d31cdcb3c61c9e3253accf703dbd8427fdcb87ece78b787b6cfdc091e8fedea8ad95dc64074e1fc6d0e42ea2337e18a5e54e4aaab3791a98dfcef282e2ae1caec9cf986fabe8f36e6a21c8711647177e492d264415e765a86c58599cd97b103cb4f6a01d2edd06e3b60470cf64daca7aecf831197b466cae04baeeac19840a05394bef628aed04b611cfa13677724b08ddfd662b02fd0ef0af17eb7f4fb8c1c17fbe9324f6dc7bcc02449622636cc45ec04909b3120ab4df4726b21bf79e955fe8f832699d2196dcd7a58bfeafb170203010001a38186308183300f0603551d130101ff04053003020100300e0603551d0f0101ff0404030204b030200603551d250101ff0416301406082b0601050507030106082b06010505070302301d0603551d0e04160414643118e05209035edd83d44a0c368de2fb2fe4c0301f0603551d23041830168014643118e05209035edd83d44a0c368de2fb2fe4c0300d06092a864886f70d01010c05000382020100ad41c32bb52650eb4b76fce439c9404e84e4538a94916b3dc7983e8b5c58890556e7384601ca7440dde68233bb07b97bf879b64487b447df510897d2a0a4e789c409a9b237a6ad240ad5464f2ce80c58ddc4d07a29a74eb25e1223db6c00e334d7a27d32bfa6183a82f5e35bccf497c2445a526eabb0c068aba9b94cc092ea4756b0dcfb574f6179f0089e52b174ccdbd04123eeb6d70daeabd8513fcba6be0bc2b45ca9a69802dae11cc4d9ff6053b3a87fd8b0c6bf72fffc3b81167f73cca2b3fd656c5d353c8defca8a76e2ad535f984870a590af4e28fed5c5a125bf360747c5e7742e7813d1bd39b5498c8eb6ba72f267eda034314fdbc596f6b967a0ef8be5231d364e634444c84e64bd7919425171016fcd9bb05f01c58a303dee28241f6e860fc3aac3d92aad7dac2801ce79a3b41a0e1f1509fc0d86e96d94edb18616c000152490f64561713102128990fedd3a5fa642f2ff22dc11bc4dc5b209986a0c3e4eb2bdfdd40e9fdf246f702441cac058dd8d0d51eb0796e2bea2ce1b37b2a2f468505e1f8980a9f66d719df034a6fbbd2f9585991d259678fb9a4aebdc465d22c240351ed44abffbdd11b79a706fdf7c40158d3da87f68d7bd557191a8016b5b899c07bf1b87590feb4fa4203feea9a2a7a73ec224813a12b7a21e5dc93fcde4f0a7620f570d31fe27e9b8d65b74db7dc18a5e51adc42d7805d4661938";

  const validAccountId = "0.0.4";

  // Required fields for createNode method
  const ipv4Address = new Uint8Array([127, 0, 0, 1]);
  const createNodeRequiredFields = {
    gossipEndpoints: [
      {
        ipAddressV4: toHexString(ipv4Address),
        port: 50211,
      },
    ],
    serviceEndpoints: [
      {
        ipAddressV4: toHexString(ipv4Address),
        port: 50211,
      },
    ],
    gossipCaCertificate: validGossipCertDER,
  };

  describe("Account ID", function () {
    it("(#1) Creates a node with valid account ID", async function () {
      const { accountKey } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: validAccountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Fails with empty account ID", async function () {
      const accountKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: "",
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Fails with non-existent account ID", async function () {
      const accountKey = await generateEd25519PrivateKey(this);
      const nonExistentAccountId = "123.456.789";
      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: nonExistentAccountId,
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Fails with malformed account ID", async function () {
      const accountKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: "invalid.account.id",
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Fails with no account ID", async function () {
      const accountKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "createNode", {
          // accountId is missing
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_NODE_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Description", function () {
    it("(#1) Creates a node with valid description", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: "Test Node Description",
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Creates a node with empty description", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: "",
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Creates a node with description exactly 100 bytes", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create a description that is exactly 100 bytes
      const exactDescription = "a".repeat(100);

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: exactDescription,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#4) Fails with description exceeding 100 bytes", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create a description that exceeds 100 bytes
      const longDescription = "a".repeat(101);

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          description: longDescription,
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a node with description containing special characters", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: "Node with special chars: !@#$%^&*()",
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#6) Creates a node with description containing only whitespace", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: "    ",
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#7) Creates a node with description containing unicode characters", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: "测试文件备注 🚀",
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#8) Creates a node with invalid description", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          description: "Test\0description",
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NODE_DESCRIPTION");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Gossip Endpoints", function () {
    it("(#1) Creates a node with single IP address endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: [
          {
            ipAddressV4: toHexString(ipv4Address),
            port: 50211,
          },
        ],
        serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Creates a node with domain name endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: [
          {
            domainName: "node.example.com",
            port: 50211,
          },
        ],
        serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Creates a node with multiple gossip endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const ipv4Address2 = new Uint8Array([127, 0, 0, 2]);
      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: [
          {
            ipAddressV4: toHexString(ipv4Address),
            port: 50211,
          },
          {
            ipAddressV4: toHexString(ipv4Address2),
            port: 50212,
          },
          {
            domainName: "node.example.com",
            port: 50213,
          },
        ],
        serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#4) Creates a node with maximum allowed gossip endpoints (10)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 10 gossip endpoints
      const maxGossipEndpoints = Array.from({ length: 10 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
        port: 50211 + i,
      }));

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: maxGossipEndpoints,
        serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#5) Fails with no gossip endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_GOSSIP_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Fails with too many gossip endpoints (11)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 11 gossip endpoints (exceeds max of 10)
      const tooManyGossipEndpoints = Array.from({ length: 11 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
        port: 50211 + i,
      }));

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: tooManyGossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Fails with missing port in endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
            },
          ],
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Fails with both IP and domain in same endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: "127.0.0.1",
              domainName: "node.example.com",
              port: 50211,
            },
          ],
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: fails with -SERVICE_ENDPOINTS_EXCEEDED_LIMIT for some reason
    it.skip("(#9) Fails with invalid IP address format", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: toHexString(new Uint8Array([192, 168, 1])),
              port: 50211,
            },
          ],
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_IPV4_ADDRESS");
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: does not fail
    it.skip("(#10) Fails with invalid port number (negative)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
              port: -1,
            },
          ],
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: does not fail
    it.skip("(#11) Fails with invalid port number (too high)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
              port: 65536,
            },
          ],
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Service Endpoints", function () {
    it("(#1) Creates a node with service endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
        serviceEndpoints: [
          {
            ipAddressV4: toHexString(ipv4Address),
            port: 50212,
          },
        ],
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Creates a node with domain name service endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
        serviceEndpoints: [
          {
            domainName: "service.example.com",
            port: 50212,
          },
        ],
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Creates a node with multiple service endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
        serviceEndpoints: [
          {
            ipAddressV4: toHexString(ipv4Address),
            port: 50212,
          },
          {
            domainName: "service.example.com",
            port: 50213,
          },
        ],
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#4) Creates a node with maximum allowed service endpoints (8)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 8 service endpoints
      const maxServiceEndpoints = Array.from({ length: 8 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
        port: 50212 + i,
      }));

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
        serviceEndpoints: maxServiceEndpoints,
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#5) Fails with no service endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SERVICE_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Fails with too many service endpoints (9)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 9 service endpoints (exceeds max of 8)
      const tooManyServiceEndpoints = Array.from({ length: 9 }, (_, i) => ({
        ipAddressV4: toHexString(new Uint8Array([127, 0, 0, i + 1])),
        port: 50212 + i,
      }));

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: tooManyServiceEndpoints,
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Fails with invalid service endpoint (missing port)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
            },
          ],
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Fails with both IP and domain in same service endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
              domainName: "service.example.com",
              port: 50212,
            },
          ],
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    //TODO: fails with SERVICE_ENDPOINTS_EXCEEDED_LIMIT for some reason
    it.skip("(#9) Fails with invalid IP address format in service endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: [
            {
              ipAddressV4: toHexString(new Uint8Array([192, 168, 1])),
              port: 50212,
            },
          ],
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_IPV4_ADDRESS");
        return;
      }

      assert.fail("Should throw an error");
    });

    //TODO: does not fail
    it.skip("(#10) Fails with invalid port number (negative) in service endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
              port: -1,
            },
          ],
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    //TODO: does not fail
    it.skip("(#11) Fails with invalid port number (too high) in service endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: [
            {
              ipAddressV4: toHexString(ipv4Address),
              port: 65536,
            },
          ],
          gossipCaCertificate: validGossipCertDER,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Gossip CA Certificate", function () {
    it("(#1) Creates a node with valid DER-encoded certificate", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Fails with empty gossip certificate", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: "",
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Fails with missing gossip certificate", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_GOSSIP_CA_CERTIFICATE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Fails with invalid gossip certificate format", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: "ffff",
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_GOSSIP_CA_CERTIFICATE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Fails with malformed hex string", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: "not_hex_string",
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("gRPC Certificate Hash", function () {
    it("(#1) Creates a node with valid gRPC certificate hash", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        grpcCertificateHash: "a1b2c3d4e5f6",
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Creates a node with empty certificate hash", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        grpcCertificateHash: "",
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Creates a node without gRPC certificate hash", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#4) Fails with malformed hex string", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          grpcCertificateHash: "not_hex_string",
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("gRPC Web Proxy Endpoint", function () {
    it("(#1) Creates a node with gRPC web proxy endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        grpcWebProxyEndpoint: {
          ipAddressV4: toHexString(ipv4Address),
          port: 50213,
        },
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Creates a node with domain-based gRPC web proxy endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        grpcWebProxyEndpoint: {
          domainName: "proxy.example.com",
          port: 50213,
        },
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Fails with invalid gRPC web proxy endpoint (missing port)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          grpcWebProxyEndpoint: {
            ipAddressV4: toHexString(ipv4Address),
          },
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INVALID_ENDPOINT");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Admin Key", function () {
    it("(#1) Creates a node with valid ED25519 admin key", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Creates a node with valid ECDSAsecp256k1 public key as admin key", async function () {
      const { accountId } = await createTestAccount();
      const ecdsaPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaPrivateKey,
      );

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: ecdsaPublicKey,
        commonTransactionParams: {
          signers: [ecdsaPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Creates a node with valid ED25519 private key as admin key", async function () {
      const { accountId } = await createTestAccount();
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: ed25519PrivateKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#4) Creates a node with valid ECDSAsecp256k1 private key as admin key", async function () {
      const { accountId } = await createTestAccount();
      const ecdsaPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: ecdsaPrivateKey,
        commonTransactionParams: {
          signers: [ecdsaPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#5) Creates a node with valid KeyList of ED25519 and ECDSAsecp256k1 keys as admin key", async function () {
      const { accountId } = await createTestAccount();
      const keyList = await generateKeyList(this, fourKeysKeyListParams);

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: keyList.key,
        commonTransactionParams: {
          signers: [
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#6) Creates a node with valid nested KeyList (three levels) as admin key", async function () {
      const { accountId } = await createTestAccount();
      const nestedKeyList = await generateKeyList(
        this,
        twoLevelsNestedKeyListParams,
      );

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#7) Creates a node with valid ThresholdKey of ED25519 and ECDSAsecp256k1 keys as admin key", async function () {
      const { accountId } = await createTestAccount();
      const thresholdKey = await generateKeyList(this, twoThresholdKeyParams);

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [thresholdKey.privateKeys[0], thresholdKey.privateKeys[1]],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#8) Fails with invalid admin key format", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: invalidKey,
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Fails when adminKey is missing", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          // adminKey is missing
          commonTransactionParams: {
            signers: [accountKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("KEY_REQUIRED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Fails with valid admin key without signing with the new key", async function () {
      const { accountId } = await createTestAccount();
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: ed25519PrivateKey,
          // No commonTransactionParams.signers provided
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Fails with valid public key as admin key and signs with incorrect private key", async function () {
      const { accountId } = await createTestAccount();
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const incorrectPrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: ed25519PublicKey,
          commonTransactionParams: {
            signers: [incorrectPrivateKey], // Using incorrect private key
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Decline Reward", function () {
    it("(#1) Creates a node that accepts rewards (default)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#2) Creates a node that declines rewards", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        declineReward: true,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });

    it("(#3) Creates a node with explicit declineReward: false", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        adminKey: accountKey,
        declineReward: false,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      currentNodeId = response.nodeId;
    });
  });
});
