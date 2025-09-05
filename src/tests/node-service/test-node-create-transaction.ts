import "dotenv/config";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import { generateEd25519PrivateKey } from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for NodeCreateTransaction
 */

describe("NodeCreateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  afterEach(async function () {
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
  const createNodeRequiredFields = {
    gossipEndpoints: [
      {
        ipAddressV4: "127.0.0.1",
        port: 50211,
      },
    ],
    serviceEndpoints: [
      {
        ipAddressV4: "127.0.0.1",
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
  });

  describe("Description", function () {
    it("(#5) Creates a node with valid description", async function () {
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
    });

    it("(#6) Creates a node with empty description", async function () {
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
    });

    it("(#7) Creates a node with description exactly 100 bytes", async function () {
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
    });

    it("(#8) Fails with description exceeding 100 bytes", async function () {
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
  });

  describe("Gossip Endpoints", function () {
    it("(#10) Creates a node with single IP address endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: [
          {
            ipAddressV4: "127.0.0.1",
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
    });

    it("(#11) Creates a node with domain name endpoint", async function () {
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
    });

    it("(#12) Creates a node with multiple gossip endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: [
          {
            ipAddressV4: "127.0.0.1",
            port: 50211,
          },
          {
            ipAddressV4: "127.0.0.2",
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
    });

    it("(#13) Creates a node with maximum allowed gossip endpoints (10)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 10 gossip endpoints
      const maxGossipEndpoints = Array.from({ length: 10 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
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
    });

    it("(#14) Fails with empty gossip endpoints array", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [],
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

    it("(#15) Fails with too many gossip endpoints (11)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 11 gossip endpoints (exceeds max of 10)
      const tooManyGossipEndpoints = Array.from({ length: 11 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
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

    it("(#16) Fails with missing port in endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: "127.0.0.1",
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

    it("(#17) Fails with both IP and domain in same endpoint", async function () {
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

    it("(#18) Fails with invalid IP address format", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: "invalid_ip",
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

    it.skip("(#19) Fails with invalid port number (negative)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: "127.0.0.1",
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
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#20) Fails with invalid port number (too high)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: [
            {
              ipAddressV4: "127.0.0.1",
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
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Service Endpoints", function () {
    it("(#21) Creates a node with service endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
        serviceEndpoints: [
          {
            ipAddressV4: "127.0.0.1",
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
    });

    it("(#22) Creates a node with multiple service endpoints", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
        serviceEndpoints: [
          {
            ipAddressV4: "127.0.0.1",
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
    });

    it("(#23) Creates a node with maximum allowed service endpoints (8)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 8 service endpoints
      const maxServiceEndpoints = Array.from({ length: 8 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
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
    });

    it("(#24) Fails with too many service endpoints (9)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      // Create 9 service endpoints (exceeds max of 8)
      const tooManyServiceEndpoints = Array.from({ length: 9 }, (_, i) => ({
        ipAddressV4: `127.0.0.${i + 1}`,
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

    it("(#25) Fails with invalid service endpoint (missing port)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: [
            {
              ipAddressV4: "127.0.0.1",
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
  });

  describe("Gossip CA Certificate", function () {
    it("(#26) Creates a node with valid DER-encoded certificate", async function () {
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

    it("(#27) Fails with empty gossip certificate", async function () {
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
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#28) Fails with invalid gossip certificate format (not hex string)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          gossipCaCertificate: "invalid_cert",
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
    it("(#30) Creates a node with valid gRPC certificate hash", async function () {
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
    });

    it("(#31) Creates a node without gRPC certificate hash", async function () {
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

    it.skip("(#32) Fails with invalid gRPC certificate hash format", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          grpcCertificateHash: "invalid_hash",
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

  describe.skip("gRPC Web Proxy Endpoint", function () {
    it("(#33) Creates a node with gRPC web proxy endpoint", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        ...createNodeRequiredFields,
        grpcWebProxyEndpoint: {
          ipAddressV4: "127.0.0.1",
          port: 50213,
        },
        adminKey: accountKey,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#34) Creates a node with domain-based gRPC web proxy endpoint", async function () {
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
    });

    it("(#35) Fails with invalid gRPC web proxy endpoint (missing port)", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          grpcWebProxyEndpoint: {
            ipAddressV4: "127.0.0.1",
          },
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

  describe("Admin Key", function () {
    it("(#36) Creates a node with valid ED25519 admin key", async function () {
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

    it("(#37) Fails with empty admin key", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: "",
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

    it("(#38) Fails with invalid admin key format", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: "invalid_key",
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

  describe("Decline Reward", function () {
    it("(#39) Creates a node that accepts rewards (default)", async function () {
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

    it("(#40) Creates a node that declines rewards", async function () {
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
    });

    it("(#41) Creates a node with explicit declineReward: false", async function () {
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
    });
  });

  describe("Common Transaction Params", function () {
    it("(#42) Creates a node with valid signers", async function () {
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

    it("(#43) Fails without signing", async function () {
      const { accountId, accountKey } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: accountKey,
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#44) Fails with empty signers array", async function () {
      const { accountId, accountKey } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          ...createNodeRequiredFields,
          adminKey: accountKey,
          commonTransactionParams: {
            signers: [],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Missing Required Fields", function () {
    it("(#47) Fails when accountId is missing", async function () {
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
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#48) Fails when gossipEndpoints is missing", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          // gossipEndpoints is missing
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

    it("(#49) Fails when gossipCaCertificate is missing", async function () {
      const { accountKey, accountId } = await createTestAccount();

      try {
        await JSONRPCRequest(this, "createNode", {
          accountId: accountId,
          gossipEndpoints: createNodeRequiredFields.gossipEndpoints,
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          // gossipCaCertificate is missing
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

    it("(#50) Fails when adminKey is missing", async function () {
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
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#51) Fails when multiple required fields are missing", async function () {
      const accountKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "createNode", {
          // accountId, gossipEndpoints, gossipCaCertificate, and adminKey are all missing
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
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

    it("(#52) Fails when all required fields are missing", async function () {
      try {
        await JSONRPCRequest(this, "createNode", {
          // All required fields are missing
          description: "Test Node",
          serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
          grpcCertificateHash: "a1b2c3d4e5f6",
          declineReward: false,
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#53) Fails when only optional fields are provided", async function () {
      try {
        await JSONRPCRequest(this, "createNode", {
          // Only optional fields provided, no required fields
          description: "Test Node",
          serviceEndpoints: [
            {
              ipAddressV4: "127.0.0.1",
              port: 50212,
            },
          ],
          grpcCertificateHash: "a1b2c3d4e5f6",
          grpcWebProxyEndpoint: {
            ipAddressV4: "127.0.0.1",
            port: 50213,
          },
          declineReward: true,
        });
      } catch (err: any) {
        expect(err.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Integration Tests", function () {
    it("(#54) Creates a node with all optional parameters", async function () {
      const { accountKey, accountId } = await createTestAccount();

      const response = await JSONRPCRequest(this, "createNode", {
        accountId: accountId,
        description: "Full Featured Test Node",
        gossipEndpoints: [
          {
            ipAddressV4: "127.0.0.1",
            port: 50211,
          },
          {
            domainName: "gossip.example.com",
            port: 50212,
          },
        ],
        serviceEndpoints: [
          {
            ipAddressV4: "127.0.0.1",
            port: 50213,
          },
          {
            domainName: "service.example.com",
            port: 50214,
          },
        ],
        gossipCaCertificate: validGossipCertDER,
        grpcCertificateHash: "a1b2c3d4e5f6",
        grpcWebProxyEndpoint: {
          ipAddressV4: "127.0.0.1",
          port: 50215,
        },
        adminKey: accountKey,
        declineReward: true,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#55) Creates multiple nodes with different configurations", async function () {
      const { accountKey: accountKey1, accountId: accountId1 } =
        await createTestAccount();
      const { accountKey: accountKey2, accountId: accountId2 } =
        await createTestAccount();

      // Create first node
      const response1 = await JSONRPCRequest(this, "createNode", {
        accountId: accountId1,
        description: "Node 1",
        ...createNodeRequiredFields,
        adminKey: accountKey1,
        declineReward: false,
        commonTransactionParams: {
          signers: [accountKey1],
        },
      });

      // Create second node
      const response2 = await JSONRPCRequest(this, "createNode", {
        accountId: accountId2,
        description: "Node 2",
        gossipEndpoints: [
          {
            domainName: "node2.example.com",
            port: 50212,
          },
        ],
        serviceEndpoints: createNodeRequiredFields.serviceEndpoints,
        gossipCaCertificate: validGossipCertDER,
        adminKey: accountKey2,
        declineReward: true,
        commonTransactionParams: {
          signers: [accountKey2],
        },
      });

      expect(response1.status).to.equal("SUCCESS");
      expect(response2.status).to.equal("SUCCESS");
    });
  });
});
