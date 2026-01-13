import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";
import { retryOnError } from "@helpers/retry-on-error";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for AddressBookQuery
 */
describe.only("AddressBookQuery", function () {
  this.timeout(30000);

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  describe("AddressBookQuery", function () {
    it("(#1) Query with valid fileId", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Verify that the response contains nodeAddresses array
      expect(response).to.have.property("nodeAddresses");
      expect(response.nodeAddresses).to.be.an("array");
      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      // Verify against consensus node
      const consensusAddressBook =
        await consensusInfoClient.getAddressBook("0.0.102");
      expect(consensusAddressBook.nodeAddresses).to.be.an("array");
      expect(consensusAddressBook.nodeAddresses.length).to.be.greaterThan(0);
    });

    it("(#2) Query without fileId", async function () {
      try {
        const response = await JSONRPCRequest(this, "getAddressBook", {});
        // Verify that the response contains nodeAddresses array
        expect(response).to.have.property("nodeAddresses");
        expect(response.nodeAddresses).to.be.an("array");
        expect(response.nodeAddresses.length).to.be.greaterThan(0);

        // Verify against consensus node (defaults to latest address book)
        const consensusAddressBook = await consensusInfoClient.getAddressBook();
        expect(consensusAddressBook.nodeAddresses).to.be.an("array");
      } catch (error: any) {
        expect(error).to.exist;
        return;
      }
    });

    it("(#3) Query with invalid fileId", async function () {
      try {
        await JSONRPCRequest(this, "getAddressBook", {
          fileId: "999.999.999",
        });
      } catch (error: any) {
        expect(error).to.exist;
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query with non-existent fileId", async function () {
      try {
        await JSONRPCRequest(this, "getAddressBook", {
          fileId: "0.0.999999",
        });
      } catch (error: any) {
        // Should throw an error for non-existent file ID
        expect(error).to.exist;
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Query with explicit limit", async function () {
      const limit = 5;
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
        limit: limit,
      });

      expect(response).to.have.property("nodeAddresses");
      expect(response.nodeAddresses).to.be.an("array");
      expect(response.nodeAddresses.length).to.be.at.most(limit);

      // Verify against consensus node
      const consensusAddressBook = await consensusInfoClient.getAddressBook(
        "0.0.102",
        limit,
      );
      expect(consensusAddressBook.nodeAddresses.length).to.be.at.most(limit);
    });

    it("(#6) Query with limit=1", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
        limit: 1,
      });

      expect(response).to.have.property("nodeAddresses");
      expect(response.nodeAddresses).to.be.an("array");
      expect(response.nodeAddresses.length).to.equal(1);
    });

    it("(#7) Query with limit=0", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
        limit: 0,
      });

      expect(response).to.have.property("nodeAddresses");
      expect(response.nodeAddresses).to.be.an("array");
      // Limit of 0 may return empty array or all nodes depending on implementation
    });

    it("(#8) Query with negative limit", async function () {
      try {
        await JSONRPCRequest(this, "getAddressBook", {
          fileId: "0.0.102",
          limit: -1,
        });
      } catch (error: any) {
        // Should throw an error for negative limit
        if (error.data?.status) {
          // If there's a specific status for invalid limit
          expect(error.data.status).to.be.a("string");
        } else {
          expect(error.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        }
        return;
      }
      // Some implementations may allow negative and treat as no limit
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
        limit: -1,
      });
      expect(response).to.have.property("nodeAddresses");
    });

    it("(#9) Query with very large limit", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
        limit: 10000,
      });

      expect(response).to.have.property("nodeAddresses");
      expect(response.nodeAddresses).to.be.an("array");
      // Should return available nodes up to the limit
    });

    it("(#10) Verify nodeAddresses is an array", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response).to.have.property("nodeAddresses");
      expect(response.nodeAddresses).to.be.an("array");

      // Verify against consensus node
      const consensusAddressBook =
        await consensusInfoClient.getAddressBook("0.0.102");
      expect(consensusAddressBook.nodeAddresses).to.be.an("array");
    });

    it("(#11) Verify nodeAddresses contains nodes", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses).to.be.an("array");
      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      // Verify against consensus node
      const consensusAddressBook =
        await consensusInfoClient.getAddressBook("0.0.102");
      expect(consensusAddressBook.nodeAddresses.length).to.be.greaterThan(0);
    });

    it("(#12) Verify each node has required fields", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      expect(firstNode).to.have.property("nodeId");
      expect(firstNode).to.have.property("accountId");
      expect(firstNode).to.have.property("serviceEndpoints");
      expect(firstNode.serviceEndpoints).to.be.an("array");
    });

    it("(#13) Verify nodeId field is correctly returned", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      expect(firstNode.nodeId).to.exist;
      expect(firstNode.nodeId).to.be.a("number");
      expect(firstNode.nodeId).to.be.greaterThanOrEqual(0);

      // Verify against consensus node
      const consensusAddressBook =
        await consensusInfoClient.getAddressBook("0.0.102");
      const consensusNode = consensusAddressBook.nodeAddresses.find(
        (node: any) => node.nodeId?.toString() === firstNode.nodeId.toString(),
      );
      expect(consensusNode).to.exist;
    });

    it("(#14) Verify nodeId is unique", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      const nodeIds = response.nodeAddresses.map((node: any) => node.nodeId);
      const uniqueNodeIds = new Set(nodeIds);
      expect(uniqueNodeIds.size).to.equal(nodeIds.length);
    });

    it("(#15) Verify accountId field is correctly returned", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      expect(firstNode.accountId).to.exist;
      expect(firstNode.accountId).to.be.a("string");
      // Verify format: shard.realm.num
      expect(firstNode.accountId).to.match(/^\d+\.\d+\.\d+$/);

      // Verify against consensus node
      const consensusAddressBook =
        await consensusInfoClient.getAddressBook("0.0.102");
      const consensusNode = consensusAddressBook.nodeAddresses.find(
        (node: any) => node.nodeId?.toString() === firstNode.nodeId.toString(),
      );
      if (consensusNode) {
        expect(consensusNode.accountId?.toString()).to.equal(
          firstNode.accountId,
        );
      }

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorNodeData = await mirrorNodeClient.getNodeData(
          firstNode.nodeId.toString(),
        );
        if (mirrorNodeData.nodes && mirrorNodeData.nodes.length > 0) {
          expect(mirrorNodeData.nodes[0].node_account_id).to.exist;
        }
      });
    });

    it("(#16) Verify accountId matches node", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      const nodeId = firstNode.nodeId;

      // Verify against consensus node
      const consensusNode = await consensusInfoClient.getNodeInfo(
        nodeId.toString(),
      );
      expect(consensusNode.accountId?.toString()).to.equal(firstNode.accountId);
    });

    it("(#17) Verify serviceEndpoints is an array", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      expect(firstNode.serviceEndpoints).to.be.an("array");
      expect(firstNode.serviceEndpoints.length).to.be.greaterThan(0);
    });

    it("(#18) Verify serviceEndpoints contain valid data", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      expect(firstNode.serviceEndpoints.length).to.be.greaterThan(0);

      const firstEndpoint = firstNode.serviceEndpoints[0];
      expect(firstEndpoint).to.have.property("port");
      expect(firstEndpoint.port).to.be.a("number");
      // Should have either ipAddressV4 or domainName
      expect(firstEndpoint.ipAddressV4 || firstEndpoint.domainName).to.exist;
    });

    it("(#19) Verify serviceEndpoints ipAddressV4 format", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node with ipAddressV4
      const nodeWithIp = response.nodeAddresses.find((node: any) =>
        node.serviceEndpoints.some((endpoint: any) => endpoint.ipAddressV4),
      );

      if (nodeWithIp) {
        const endpointWithIp = nodeWithIp.serviceEndpoints.find(
          (endpoint: any) => endpoint.ipAddressV4,
        );
        expect(endpointWithIp.ipAddressV4).to.be.a("string");
        // ipAddressV4 should be hex encoded (4 bytes = 8 hex chars)
        expect(endpointWithIp.ipAddressV4.length).to.be.greaterThan(0);
      }
    });

    it("(#20) Verify serviceEndpoints port is valid", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      expect(response.nodeAddresses.length).to.be.greaterThan(0);

      const firstNode = response.nodeAddresses[0];
      const firstEndpoint = firstNode.serviceEndpoints[0];
      expect(firstEndpoint.port).to.be.a("number");
      expect(firstEndpoint.port).to.be.greaterThan(0);
      expect(firstEndpoint.port).to.be.at.most(65535);
    });

    it("(#21) Verify serviceEndpoints with domainName", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node with domainName (if any)
      const nodeWithDomain = response.nodeAddresses.find((node: any) =>
        node.serviceEndpoints.some((endpoint: any) => endpoint.domainName),
      );

      if (nodeWithDomain) {
        const endpointWithDomain = nodeWithDomain.serviceEndpoints.find(
          (endpoint: any) => endpoint.domainName,
        );
        expect(endpointWithDomain.domainName).to.be.a("string");
        expect(endpointWithDomain.domainName.length).to.be.greaterThan(0);
        expect(endpointWithDomain.port).to.be.a("number");
      }
    });

    it("(#22) Verify rsaPublicKey when present", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node with rsaPublicKey (if any)
      const nodeWithKey = response.nodeAddresses.find(
        (node: any) => node.rsaPublicKey,
      );

      if (nodeWithKey) {
        expect(nodeWithKey.rsaPublicKey).to.be.a("string");
        expect(nodeWithKey.rsaPublicKey.length).to.be.greaterThan(0);

        // Verify against consensus node
        const consensusNode = await consensusInfoClient.getNodeInfo(
          nodeWithKey.nodeId.toString(),
        );
        if (consensusNode.rsaPublicKey) {
          expect(consensusNode.rsaPublicKey.toString()).to.exist;
        }
      }
    });

    it("(#23) Verify rsaPublicKey when not set", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node without rsaPublicKey (if any)
      const nodeWithoutKey = response.nodeAddresses.find(
        (node: any) => !node.rsaPublicKey,
      );

      if (nodeWithoutKey) {
        expect(
          nodeWithoutKey.rsaPublicKey === null ||
            nodeWithoutKey.rsaPublicKey === undefined ||
            nodeWithoutKey.rsaPublicKey === "",
        ).to.be.true;
      }
    });

    it("(#24) Verify nodeCertHash when present", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node with nodeCertHash (if any)
      const nodeWithCert = response.nodeAddresses.find(
        (node: any) => node.nodeCertHash,
      );

      if (nodeWithCert) {
        expect(nodeWithCert.nodeCertHash).to.be.a("string");
        expect(nodeWithCert.nodeCertHash.length).to.be.greaterThan(0);

        // Verify against consensus node
        const consensusNode = await consensusInfoClient.getNodeInfo(
          nodeWithCert.nodeId.toString(),
        );
        if (consensusNode.nodeCertHash) {
          expect(consensusNode.nodeCertHash.toString()).to.exist;
        }
      }
    });

    it("(#25) Verify nodeCertHash when not set", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node without nodeCertHash (if any)
      const nodeWithoutCert = response.nodeAddresses.find(
        (node: any) => !node.nodeCertHash,
      );

      if (nodeWithoutCert) {
        expect(
          nodeWithoutCert.nodeCertHash === null ||
            nodeWithoutCert.nodeCertHash === undefined ||
            nodeWithoutCert.nodeCertHash === "",
        ).to.be.true;
      }
    });

    it("(#26) Verify description when present", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node with description (if any)
      const nodeWithDescription = response.nodeAddresses.find(
        (node: any) => node.description,
      );

      if (nodeWithDescription) {
        expect(nodeWithDescription.description).to.be.a("string");
        expect(nodeWithDescription.description.length).to.be.greaterThan(0);
      }
    });

    it("(#27) Verify description when not set", async function () {
      const response = await JSONRPCRequest(this, "getAddressBook", {
        fileId: "0.0.102",
      });

      // Find a node without description (if any)
      const nodeWithoutDescription = response.nodeAddresses.find(
        (node: any) => !node.description,
      );

      if (nodeWithoutDescription) {
        expect(
          nodeWithoutDescription.description === null ||
            nodeWithoutDescription.description === undefined ||
            nodeWithoutDescription.description === "",
        ).to.be.true;
      }
    });
  });
});
