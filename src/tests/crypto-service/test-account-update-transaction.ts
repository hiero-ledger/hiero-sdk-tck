import { expect, assert } from "chai";
import { PublicKey } from "@hashgraph/sdk";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import { getRawKeyFromHex } from "@helpers/asn1-decoder";
import {
  getEncodedKeyHexFromKeyListConsensus,
  getPublicKeyFromMirrorNode,
} from "@helpers/key";

import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
  twoThresholdKeyParams,
} from "@constants/key-list";
import { ErrorStatusCodes } from "@enums/error-status-codes";

describe("AccountUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  this.retries(100);

  // An account is created for each test. These hold the information for that account.
  let accountPrivateKey: string, accountId: string;

  beforeEach(async function () {
    // Initialize the network and operator.
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Generate a private key.
    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });

    accountPrivateKey = response.key;

    // Create an account using the generated private key.
    response = await JSONRPCRequest(this, "createAccount", {
      key: accountPrivateKey,
    });

    accountId = response.accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("AccountId", async function () {
    it("(#1) Updates an account with no updates", async function () {
      // Attempt to update the account.
      await JSONRPCRequest(this, "updateAccount", {
        accountId: accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Account info should remain the same
      const mirrorNodeData = await mirrorNodeClient.getAccountData(accountId);
      const consensusNodeData =
        await consensusInfoClient.getAccountInfo(accountId);
      expect(accountId).to.be.equal(mirrorNodeData.account);
      expect(accountId).to.be.equal(consensusNodeData.accountId.toString());
    });

    it("(#2) Updates an account with no updates without signing with the account's private key", async function () {
      try {
        // Attempt to update the account without signing with the account's private key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId: accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Updates an account with no account ID", async function () {
      try {
        // Attempt to update the account without providing the account ID. The network should respond with an ACCOUNT_ID_DOES_NOT_EXIST status.
        await JSONRPCRequest(this, "updateAccount", {});
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_ID_DOES_NOT_EXIST");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Key", async function () {
    const verifyAccountUpdateKey = async (
      accountId: string,
      updatedKey: string,
    ) => {
      // If the account was updated successfully, the queried account keys should be equal.
      const rawKey = getRawKeyFromHex(updatedKey);

      // Consensus node check
      expect(rawKey).to.equal(
        (
          (await consensusInfoClient.getAccountInfo(accountId)).key as PublicKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        (await mirrorNodeClient.getAccountData(accountId))["key"],
      );

      // Mirror node check
      expect(rawKey).to.equal(publicKeyMirrorNode?.toStringRaw());
    };

    const verifyAccountUpdateKeyList = async (
      accountId: string,
      updatedKey: string,
    ) => {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getAccountInfo",
        accountId,
        "key",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(updatedKey.slice(updatedKey.length - keyHex.length)).to.equal(
        keyHex,
      );

      // Mirror node check
      const mirrorNodeKey = (await mirrorNodeClient.getAccountData(accountId))
        .key.key;

      expect(updatedKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey?.slice(mirrorNodeKey.length - updatedKey.length),
      );
    };

    it("(#1) Updates the key of an account to a new valid ED25519 public key", async function () {
      // Generate a new ED25519 private key for the account.
      const ed25519PrivateKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Generate the corresponding ED25519 public key.
      const ed25519PublicKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: ed25519PrivateKey.key,
      });

      // Attempt to update the key of the account with the new ED25519 public key.
      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        key: ed25519PublicKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ed25519PrivateKey.key],
        },
      });

      // Verify the account key was updated (use raw key for comparison, ED25519 public key DER-encoding has a 12 byte prefix).
      await retryOnError(async () =>
        verifyAccountUpdateKey(accountId, ed25519PublicKey.key),
      );
    });

    it("(#2) Updates the key of an account to a new valid ECDSAsecp256k1 public key", async function () {
      // Generate a new ECDSAsecp256k1 private key for the account.
      const ecdsaSecp256k1PrivateKey = await JSONRPCRequest(
        this,
        "generateKey",
        {
          type: "ecdsaSecp256k1PrivateKey",
        },
      );

      // Generate the corresponding ECDSAsecp256k1 public key.
      //prettier-ignore
      const ecdsaSecp256k1PublicKey = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: ecdsaSecp256k1PrivateKey.key,
      });

      // Attempt to update the key of the account with the new ECDSAsecp256k1 public key.
      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        key: ecdsaSecp256k1PublicKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ecdsaSecp256k1PrivateKey.key],
        },
      });

      // Verify the account key was updated (use raw key for comparison, compressed ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix).
      await retryOnError(async () =>
        verifyAccountUpdateKey(accountId, ecdsaSecp256k1PublicKey.key),
      );
    });

    it("(#3) Updates the key of an account to a new valid ED25519 private key", async function () {
      // Generate a new ED25519 private key for the account.
      const ed25519PrivateKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Generate the corresponding ED25519 public key.
      const ed25519PublicKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: ed25519PrivateKey.key,
      });

      // Attempt to update the key of the account with the new ED25519 private key.
      await JSONRPCRequest(this, "updateAccount", {
        accountId: accountId,
        key: ed25519PrivateKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ed25519PrivateKey.key],
        },
      });

      // Verify the account key was updated (use raw key for comparison, ED25519 public key DER-encoding has a 12 byte prefix).
      await retryOnError(async () =>
        verifyAccountUpdateKey(accountId, ed25519PublicKey.key),
      );
    });

    it("(#4) Updates the key of an account to a new valid ECDSAsecp256k1 private key", async function () {
      // Generate a new ECDSAsecp256k1 private key for the account.
      const ecdsaSecp256k1PrivateKey = await JSONRPCRequest(
        this,
        "generateKey",
        {
          type: "ecdsaSecp256k1PrivateKey",
        },
      );

      // Generate the corresponding ECDSAsecp256k1 public key.
      const ecdsaSecp256k1PublicKey = await JSONRPCRequest(
        this,
        "generateKey",
        {
          type: "ecdsaSecp256k1PublicKey",
          fromKey: ecdsaSecp256k1PrivateKey.key,
        },
      );

      // Attempt to update the key of the account with the new ECDSAsecp256k1 public key.
      await JSONRPCRequest(this, "updateAccount", {
        accountId: accountId,
        key: ecdsaSecp256k1PrivateKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ecdsaSecp256k1PrivateKey.key],
        },
      });

      // Verify the account key was updated (use raw key for comparison, compressed ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix).
      await retryOnError(async () =>
        verifyAccountUpdateKey(accountId, ecdsaSecp256k1PublicKey.key),
      );
    });

    it("(#5) Updates the key of an account to a new valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      // Generate a KeyList of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      // Attempt to update the key of the account with the new KeyList of ED25519 and ECDSAsecp256k1 private and public keys.
      await JSONRPCRequest(this, "updateAccount", {
        accountId: accountId,
        key: keyList.key,
        commonTransactionParams: {
          signers: [
            accountPrivateKey,
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      // Verify the account key was updated.
      await retryOnError(async () =>
        verifyAccountUpdateKeyList(accountId, keyList.key),
      );
    });

    it("(#6) Updates the key of an account to a new valid KeyList of nested KeyLists (three levels)", async function () {
      // Generate a KeyList of nested KeyLists of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      // Attempt to update the key of the account with the new KeyList of nested KeyLists.
      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        key: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            accountPrivateKey,
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      // Verify the account key was updated.
      await retryOnError(async () =>
        verifyAccountUpdateKeyList(accountId, nestedKeyList.key),
      );
    });

    it("(#7) Updates the key of an account to a new valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      // Generate a ThresholdKey of nested KeyLists of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      // Attempt to update the key of the account with the new ThresholdKey.
      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        key: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            accountPrivateKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });

      // Verify the account key was updated.
      await retryOnError(async () =>
        verifyAccountUpdateKeyList(accountId, thresholdKey.key),
      );
    });

    it("(#8) Updates the key of an account to a key without signing with the new key", async function () {
      // Generate a new key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      try {
        // Attempt to update the key of the account with the new key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          key: key.key,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#9) Updates the key of an account to a new public key and signs with an incorrect private key", async function () {
      // Generate a new public key for the account.
      const publicKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      // Generate a random private key.
      const privateKey = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      try {
        // Attempt to update the key of the account and sign with the random private key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          key: publicKey.key,
          commonTransactionParams: {
            signers: [privateKey.key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Period", async function () {
    const verifyAccountAutoRenewPeriodUpdate = async (
      autoRenewPeriodSeconds: string,
    ) => {
      // If the account was updated successfully, the queried account's auto renew periods should be equal.
      expect(autoRenewPeriodSeconds).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).autoRenewPeriod.seconds.toString(),
      );
      expect(autoRenewPeriodSeconds).to.equal(
        (
          await mirrorNodeClient.getAccountData(accountId)
        ).auto_renew_period?.toString(),
      );
    };

    it("(#1) Updates the auto-renew period of an account to 60 days (5,184,000 seconds)", async function () {
      // Attempt to update the auto-renew period of the account 60 days.
      const autoRenewPeriod = "5184000";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with an auto-renew period set to 60 days.
      await retryOnError(() =>
        verifyAccountAutoRenewPeriodUpdate(autoRenewPeriod),
      );
    });

    it("(#2) Updates the auto-renew period of an account to -1 seconds", async function () {
      try {
        // Attempt to update the auto-renew period of the account to -1 seconds. The network should respond with an INVALID_RENEWAL_PERIOD status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          autoRenewPeriod: "-1",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Updates the auto-renew period of an account to 30 days (2,592,000 seconds)", async function () {
      // Attempt to update the auto-renew period of the account to 30 days.
      const autoRenewPeriod = "2592000";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with an auto-renew period set to 30 days.
      await retryOnError(async () =>
        verifyAccountAutoRenewPeriodUpdate(autoRenewPeriod),
      );
    });

    it("(#4) Updates the auto-renew period of an account to 30 days minus one second (2,591,999 seconds)", async function () {
      try {
        // Attempt to update the auto-renew period of the account to 2,591,999 seconds. The network should respond with an AUTORENEW_DURATION_NOT_IN_RANGE status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          autoRenewPeriod: "2591999",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Updates the auto-renew period of an account to the maximum period of 8,000,001 seconds", async function () {
      // Attempt to update the auto-renew period of the account to 8,000,001 seconds.
      const autoRenewPeriod = "8000001";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with an auto-renew period set to 8,000,001 seconds.
      await retryOnError(async () =>
        verifyAccountAutoRenewPeriodUpdate(autoRenewPeriod),
      );
    });

    it("(#6) Updates the auto-renew period of an account to the maximum period plus one second (8,000,002 seconds)", async function () {
      try {
        // Attempt to update auto-renew period of the account to 8,000,002 seconds. The network should respond with an AUTORENEW_DURATION_NOT_IN_RANGE status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId: accountId,
          autoRenewPeriod: "8000002",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Expiration Time", async function () {
    const verifyAccountExpirationTimeUpdate = async (
      expirationTime: string,
    ) => {
      // If the account was updated successfully, the queried account's expiration times should be equal.
      expect(expirationTime).to.equal(
        Number(
          (await consensusInfoClient.getAccountInfo(accountId)).expirationTime
            .seconds,
        ).toString(),
      );
      expect(expirationTime).to.equal(
        Number(
          (await mirrorNodeClient.getAccountData(accountId)).expiry_timestamp,
        ).toString(),
      );
    };

    it("(#1) Updates the expiration time of an account to 8,000,001 seconds from the current time", async function () {
      // Attempt to update the expiration time of the account to 8,000,001 seconds from the current time.
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 8000001
      ).toString();

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        expirationTime,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with an expiration time set to 8,000,001 seconds from the current time.
      await retryOnError(async () =>
        verifyAccountExpirationTimeUpdate(expirationTime),
      );
    });

    it("(#2) Updates the expiration time of an account to -1 seconds", async function () {
      try {
        // Attempt to update the expiration time of the account to -1 seconds. The network should respond with an INVALID_EXPIRATION_TIME status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId: accountId,
          expirationTime: "-1",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Updates the expiration time of an account to 1 second less than its current expiration time", async function () {
      // Get the account's expiration time.
      const accountInfo = await mirrorNodeClient.getAccountData(accountId);
      const expirationTimeSeconds = accountInfo.expiry_timestamp;
      const expirationTime = Math.floor(
        Number(expirationTimeSeconds) - 1,
      ).toString();

      // Attempt to update the expiration time to 1 second less than its current expiration time. The network should respond with an EXPIRATION_REDUCTION_NOT_ALLOWED status.
      try {
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          expirationTime,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "EXPIRATION_REDUCTION_NOT_ALLOWED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Updates the expiration time of an account to 8,000,002 seconds from the current time", async function () {
      try {
        const expirationTime = (
          Math.floor(Date.now() / 1000) + 8000002
        ).toString();

        // Attempt to update the expiration time of the account to 8,000,002 seconds from the current time. The network should respond with an INVALID_EXPIRATION_TIME status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId: accountId,
          expirationTime: expirationTime,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Receiver Signature Required", async function () {
    const verifyAccountReceiverSignatureRequiredUpdate = async (
      receiverSignatureRequired: boolean,
    ) => {
      // If the account was updated successfully, the queried account's receiver signature required policies should be equal.
      expect(receiverSignatureRequired).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId))
          .isReceiverSignatureRequired,
      );
      expect(receiverSignatureRequired).to.equal(
        (await mirrorNodeClient.getAccountData(accountId))
          .receiver_sig_required,
      );
    };

    it("(#1) Updates the receiver signature required policy of an account to require a receiving signature", async function () {
      // Attempt to update the receiver signature required policy of the account to require a signature when receiving.
      const receiverSignatureRequired = true;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        receiverSignatureRequired,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account receiver signature required policy was updated.
      await retryOnError(async () =>
        verifyAccountReceiverSignatureRequiredUpdate(receiverSignatureRequired),
      );
    });

    it("(#2) Updates the receiver signature required policy of an account to not require a receiving signature", async function () {
      // Attempt to update the receiver signature required policy of the account to not require a signature when receiving.
      const receiverSignatureRequired = false;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        receiverSignatureRequired,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account receiver signature required policy was updated.
      await retryOnError(async () =>
        verifyAccountReceiverSignatureRequiredUpdate(receiverSignatureRequired),
      );
    });
  });

  describe("Memo", async function () {
    const verifyAccountMemoUpdate = async (memo: string) => {
      // If the account was updated successfully, the queried account's memos should be equal.
      expect(memo).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId)).accountMemo,
      );
      expect(memo).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).memo,
      );
    };

    it("(#1) Updates the memo of an account to a memo that is a valid length", async function () {
      // Attempt to update the memo of the account to a memo that is a valid length.
      const memo = "testmemo";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        memo,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with the memo set to "testmemo".
      await retryOnError(async () => verifyAccountMemoUpdate(memo));
    });

    it("(#2) Updates the memo of an account to a memo that is the minimum length", async function () {
      // Attempt to update the memo of the account with a memo that is the minimum length.
      const memo = "";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        memo,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with an empty memo.
      await retryOnError(async () => verifyAccountMemoUpdate(memo));
    });

    it("(#3) Updates the memo of an account to a memo that is the maximum length", async function () {
      // Attempt to update the memo of the account with a memo that is the maximum length.
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        memo,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the account was updated with the memo set to "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!".
      await retryOnError(async () => verifyAccountMemoUpdate(memo));
    });

    it("(#4) Updates the memo of an account to a memo that exceeds the maximum length", async function () {
      try {
        // Attempt to update the memo of the account with a memo that exceeds the maximum length. The network should respond with a MEMO_TOO_LONG status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Max Automatic Token Associations", async function () {
    const verifyMaxAutoTokenAssociationsUpdate = async (
      maxAutomaticTokenAssociations: number,
    ) => {
      // If the account was updated successfully, the queried account's max automatic token associations should be equal.
      expect(maxAutomaticTokenAssociations).to.equal(
        Number(
          (await consensusInfoClient.getAccountInfo(accountId))
            .maxAutomaticTokenAssociations,
        ),
      );
      expect(maxAutomaticTokenAssociations).to.equal(
        Number(
          (await mirrorNodeClient.getAccountData(accountId))
            .max_automatic_token_associations,
        ),
      );
    };

    it("(#1) Updates the max automatic token associations of an account to a valid amount", async function () {
      // Attempt to update the max automatic token associations of the account to 100.
      const maxAutoTokenAssociations = 100;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        maxAutoTokenAssociations,
        commonTransactionParams: {
          maxTransactionFee: 100000000000,
          signers: [accountPrivateKey],
        },
      });

      // Verify the max auto token associations of the account was updated.
      await retryOnError(async () =>
        verifyMaxAutoTokenAssociationsUpdate(maxAutoTokenAssociations),
      );
    });

    it("(#2) Updates the max automatic token associations of an account to the minimum amount", async function () {
      // Attempt to update the max automatic token associations of the account to 0.
      const maxAutoTokenAssociations = 0;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        maxAutoTokenAssociations,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify max auto token associations of the account was updated.
      await retryOnError(async () =>
        verifyMaxAutoTokenAssociationsUpdate(maxAutoTokenAssociations),
      );
    });

    it("(#3) Updates the max automatic token associations of an account to the maximum amount", async function () {
      // Attempt to update the max automatic token associations of the account to 5000.
      const maxAutoTokenAssociations = 5000;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        maxAutoTokenAssociations,
        commonTransactionParams: {
          maxTransactionFee: 100000000000,
          signers: [accountPrivateKey],
        },
      });

      // Verify max auto token associations of the account was updated.
      await retryOnError(async () =>
        verifyMaxAutoTokenAssociationsUpdate(maxAutoTokenAssociations),
      );
    });

    it("(#4) Updates the max automatic token associations of an account to an amount that exceeds the maximum amount", async function () {
      try {
        // Attempt to update the max automatic token associations of the account to 5001. The network should respond with a REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          maxAutoTokenAssociations: 5001,
          commonTransactionParams: {
            maxTransactionFee: 100000000000,
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT",
        );
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Staked ID", async function () {
    const verifyAccountStakedAccountIdUpdate = async (
      stakedAccountId: string,
    ) => {
      // If the account was updated successfully, the queried account's staked account IDs should be equal.
      expect(stakedAccountId.toString()).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).stakingInfo?.stakedAccountId?.toString(),
      );
      expect(stakedAccountId).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).staked_account_id,
      );
    };

    const verifyAccountStakedNodeIdUpdate = async (stakedAccountId: string) => {
      // If the account was updated successfully, the queried account's staked node IDs should be equal.
      expect(stakedAccountId).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).stakingInfo?.stakedNodeId?.toString(),
      );

      expect(stakedAccountId).to.equal(
        (
          await mirrorNodeClient.getAccountData(accountId)
        ).staked_account_id?.toString() || "0",
      );
    };

    it("(#1) Updates the staked account ID of an account to the operator's account ID", async function () {
      // Attempt to update the staked account ID of the account to the operator's account ID.
      const stakedAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        stakedAccountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the staked account ID of the account was updated.
      await retryOnError(async () =>
        verifyAccountStakedAccountIdUpdate(stakedAccountId),
      );
    });

    it("(#2) Updates the staked node ID of an account to a valid node ID", async function () {
      // Attempt to update the staked node ID of the account to a valid node ID.
      const stakedNodeId = "0";

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        stakedNodeId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the staked node ID of the account was updated.
      await retryOnError(async () =>
        verifyAccountStakedNodeIdUpdate(stakedNodeId.toString()),
      );
    });

    it("(#3) Updates the staked account ID of an account to an account ID that doesn't exist", async function () {
      try {
        // Attempt to update the staked account ID of the account to an account ID that doesn't exist. The network should respond with an INVALID_STAKING_ID status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          stakedAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Updates the staked node ID of an account to a node ID that doesn't exist", async function () {
      try {
        // Attempt to update the staked node ID of the account to a node ID that doesn't exist. The network should respond with an INVALID_STAKING_ID status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          stakedNodeId: "123456789",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Updates the staked account ID of an account to an empty account ID", async function () {
      try {
        // Attempt to update the staked account ID of the account to an empty account ID. The SDK should throw an internal error.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          stakedAccountId: "",
          commonTransactionParams: {
            signers: [accountPrivateKey],
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

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Updates the staked node ID of an account to an invalid node ID", async function () {
      try {
        // Attempt to update the staked node ID of the account to an invalid node ID. The network should respond with an INVALID_STAKING_ID status.
        await JSONRPCRequest(this, "updateAccount", {
          accountId,
          stakedNodeId: "-100",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Decline Reward", async function () {
    const verifyDeclineRewardUpdate = async (declineRewards: boolean) => {
      // If the account was updated successfully, the queried account's decline staking rewards policy should be equal.
      expect(declineRewards).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId)).stakingInfo
          ?.declineStakingReward,
      );
      expect(declineRewards).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).decline_reward,
      );
    };

    it("(#1) Updates the decline reward policy of an account to decline staking rewards", async function () {
      // Attempt to update the decline reward policy of the account to decline staking rewards.
      const declineStakingReward = true;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        declineStakingReward,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the decline reward policy of the account was updated.
      await retryOnError(async () =>
        verifyDeclineRewardUpdate(declineStakingReward),
      );
    });

    it("(#2) Updates the decline reward policy of an account to not decline staking rewards", async function () {
      // Attempt to update the decline reward policy of the account to not decline staking rewards.
      const declineStakingReward = false;

      await JSONRPCRequest(this, "updateAccount", {
        accountId,
        declineStakingReward,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Verify the decline reward policy of the account was updated.
      await retryOnError(async () =>
        verifyDeclineRewardUpdate(declineStakingReward),
      );
    });
  });

  return Promise.resolve();
});
