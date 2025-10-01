import { assert, expect } from "chai";
import { setOperator } from "@helpers/setup-tests";
import { JSONRPCRequest } from "@services/Client";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { createAccount } from "@helpers/account";

describe("AccountBalanceQueryTransaction", function () {
  this.timeout(30000);
  const decimals = "2";

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

  describe.only("Account ID/Contract ID", function () {
    it("(#1) Queries the balance of an account", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const responseAccount = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        initialBalance: "10",
      });

      const response = await JSONRPCRequest(this, "getAccountBalance", {
        accountId: responseAccount.accountId,
      });
      expect(response.hbars).to.equal("10");
    });

    it("(#2) Query for the balance with no params", async function () {
      try {
        await JSONRPCRequest(this, "getAccountBalance", {});
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the balance of an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getAccountBalance", {
          accountId: "123.456.789",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Queries the balance of a contract", async function () {
      const bytecode =
        "6080604052603e80600f5f395ff3fe60806040525f5ffdfea264697066735822122075befcb607eba7ac26552e70e14ad0b62dc41442ac32e038255f817e635c013164736f6c634300081e0033";
      const gas = "200000";
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const responseContract = await JSONRPCRequest(this, "createContract", {
        initcode: bytecode,
        gas,
        initialBalance: "1000",
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountBalance", {
        contractId: responseContract.contractId,
      });
      expect(response.hbars).to.equal("1000");
    });

    it("(#5) Query for the balance of a contract that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getAccountBalance", {
          contractId: "123.456.789",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Query for the balance with both accountId and contractId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);

      const bytecode =
        "6080604052603e80600f5f395ff3fe60806040525f5ffdfea264697066735822122075befcb607eba7ac26552e70e14ad0b62dc41442ac32e038255f817e635c013164736f6c634300081e0033";
      const gas = "200000";
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const responseContract = await JSONRPCRequest(this, "createContract", {
        initcode: bytecode,
        gas,
        initialBalance: "1000",
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountBalance", {
        contractId: responseContract.contractId,
        accountId: accountId,
      });

      expect(response.hbars).to.equal("1000");
    });

    it("(#7) Query for token balance with accountId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);

      const initialSupply = "110";

      const responseToken = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: accountId,
        decimals: decimals,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const responseBalance = await JSONRPCRequest(this, "getAccountBalance", {
        accountId: accountId,
      });

      expect(
        responseBalance.tokenBalances[responseToken?.tokenId].toString(),
      ).to.equal(initialSupply);

      expect(
        responseBalance.tokenDecimals[responseToken?.tokenId].toString(),
      ).to.equal(decimals);
    });

    it("(#8) Query for multiple tokens balance with accountId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);

      const initialSupply = "110";
      const responseToken1 = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const responseToken2 = await JSONRPCRequest(this, "createToken", {
        name: "testname2",
        symbol: "testsymbol2",
        initialSupply: initialSupply + "10",
        treasuryAccountId: accountId,
        decimals: 2,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const responseBalance = await JSONRPCRequest(this, "getAccountBalance", {
        accountId: accountId,
      });

      expect(
        responseBalance.tokenBalances[responseToken1?.tokenId].toString(),
      ).to.equal(initialSupply);

      expect(
        responseBalance.tokenBalances[responseToken2?.tokenId].toString(),
      ).to.equal(initialSupply + "10");

      expect(
        responseBalance.tokenDecimals[responseToken2?.tokenId].toString(),
      ).to.equal("2");
    });

    it("(#9) Query for NFT token balance with accountId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);
      const responseKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });
      const initialSupply = "0";

      const responseToken = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: "0",
        treasuryAccountId: accountId,
        tokenType: "nft",
        supplyKey: responseKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const responseBalance = await JSONRPCRequest(this, "getAccountBalance", {
        accountId: accountId,
      });

      expect(
        responseBalance.tokenBalances[responseToken?.tokenId].toString(),
      ).to.equal(initialSupply);

      expect(
        responseBalance.tokenDecimals[responseToken?.tokenId].toString(),
      ).to.equal("0");
    });

    it("(#10) Query for both Fungible tokens and NFT token balance with accountId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);

      const initialSupply = "110";

      const responseToken = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: accountId,
        decimals: decimals,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const responseKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });
      const responseToken2 = await JSONRPCRequest(this, "createToken", {
        name: "testname2",
        symbol: "testsymbol",
        initialSupply: "0",
        treasuryAccountId: accountId,
        tokenType: "nft",
        supplyKey: responseKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const responseBalance = await JSONRPCRequest(this, "getAccountBalance", {
        accountId: accountId,
      });

      expect(
        responseBalance.tokenBalances[responseToken?.tokenId].toString(),
      ).to.equal(initialSupply);

      expect(
        responseBalance.tokenBalances[responseToken2?.tokenId].toString(),
      ).to.equal("0");

      expect(
        responseBalance.tokenDecimals[responseToken?.tokenId].toString(),
      ).to.equal(decimals);

      expect(
        responseBalance.tokenDecimals[responseToken2?.tokenId].toString(),
      ).to.equal("0");
    });
  });

  return Promise.resolve();
});
