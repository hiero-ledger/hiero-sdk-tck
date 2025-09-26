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

  describe("Account ID/Contract ID", function () {
    it("(#1) Queries the balance of an account", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const responseAccount = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        initialBalance: "10",
      });

      const response = await JSONRPCRequest(this, "getAccountBalance", {
        accountId: responseAccount.accountId,
      });
      expect(response.balance).to.equal("10");
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
      expect(response.balance).to.equal("1000");
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

      expect(response.balance).to.equal("1000");
    });
  });

  return Promise.resolve();
});
