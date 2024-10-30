import { expect, assert } from "chai";
import { JSONRPCRequest } from "../../client.js";
import mirrorNodeClient from "../../mirrorNodeClient.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import { setOperator } from "../../setup_Tests.js";
import {
  getEncodedKeyHexFromKeyListConsensus,
  getPublicKeyFromMirrorNode,
} from "../../utils/helpers/key.js";
import { retryOnError } from "../../utils/helpers/retry-on-error.js";
import { getRawKeyFromHex } from "../../utils/helpers/asn1-decoder.js";

describe("AccountUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // An account is created for each test. These hold the information for that account.
  let accountPrivateKey, accountId;

  beforeEach(async function () {
    // Initialize the network and operator.
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    // Generate a private key.
    let response = await JSONRPCRequest("generateKey", {
      type: "ed25519PrivateKey",
    });
    if (response.status === "NOT_IMPLEMENTED") {
      this.skip();
    }
    accountPrivateKey = response.key;

    // Create an account using the generated private key.
    response = await JSONRPCRequest("createAccount", {
      key: accountPrivateKey,
    });
    if (response.status === "NOT_IMPLEMENTED") {
      this.skip();
    }
    accountId = response.accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest("reset");
  });

  describe("AccountId", async function () {
    it("(#1) Updates an account with no updates", async function () {
      // Attempt to update the account.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

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
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Updates an account with no account ID", async function () {
      try {
        // Attempt to update the account without providing the account ID. The network should respond with an ACCOUNT_ID_DOES_NOT_EXIST status.
        const response = await JSONRPCRequest("updateAccount", {});
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "ACCOUNT_ID_DOES_NOT_EXIST");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Key", async function () {
    async function verifyAccountUpdateKey(accountId, updatedKey) {
      // If the account was updated successfully, the queried account keys should be equal.
      const rawKey = getRawKeyFromHex(updatedKey);

      // Consensus node check
      expect(rawKey).to.equal(
        await (
          await consensusInfoClient.getAccountInfo(accountId)
        ).key._key.toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getAccountData",
        accountId,
        "key",
      );

      // Mirror node check
      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyAccountUpdateKeyList(accountId, updatedKey) {
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
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getAccountData(accountId)
        ).key
      ).key;

      expect(updatedKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - updatedKey.length),
      );
    }

    it("(#1) Updates the key of an account to a new valid ED25519 public key", async function () {
      // Generate a new ED25519 private key for the account.
      const ed25519PrivateKey = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (ed25519PrivateKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Generate the corresponding ED25519 public key.
      const ed25519PublicKey = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: ed25519PrivateKey.key,
      });
      if (ed25519PublicKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new ED25519 public key.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        key: ed25519PublicKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ed25519PrivateKey.key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated (use raw key for comparison, ED25519 public key DER-encoding has a 12 byte prefix).
      await retryOnError(() =>
        verifyAccountUpdateKey(accountId, ed25519PublicKey.key),
      );
    });

    it("(#2) Updates the key of an account to a new valid ECDSAsecp256k1 public key", async function () {
      // Generate a new ECDSAsecp256k1 private key for the account.
      const ecdsaSecp256k1PrivateKey = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (ecdsaSecp256k1PrivateKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Generate the corresponding ECDSAsecp256k1 public key.
      const ecdsaSecp256k1PublicKey = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: ecdsaSecp256k1PrivateKey.key,
      });
      if (ecdsaSecp256k1PublicKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new ECDSAsecp256k1 public key.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        key: ecdsaSecp256k1PublicKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ecdsaSecp256k1PrivateKey.key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated (use raw key for comparison, compressed ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix).
      await retryOnError(() =>
        verifyAccountUpdateKey(accountId, ecdsaSecp256k1PublicKey.key),
      );
    });

    it("(#3) Updates the key of an account to a new valid ED25519 private key", async function () {
      // Generate a new ED25519 private key for the account.
      const ed25519PrivateKey = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (ed25519PrivateKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Generate the corresponding ED25519 public key.
      const ed25519PublicKey = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: ed25519PrivateKey.key,
      });
      if (ed25519PublicKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new ED25519 private key.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        key: ed25519PrivateKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ed25519PrivateKey.key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated (use raw key for comparison, ED25519 public key DER-encoding has a 12 byte prefix).
      await retryOnError(() =>
        verifyAccountUpdateKey(accountId, ed25519PublicKey.key),
      );
    });

    it("(#4) Updates the key of an account to a new valid ECDSAsecp256k1 private key", async function () {
      // Generate a new ECDSAsecp256k1 private key for the account.
      const ecdsaSecp256k1PrivateKey = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (ecdsaSecp256k1PrivateKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Generate the corresponding ECDSAsecp256k1 public key.
      const ecdsaSecp256k1PublicKey = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: ecdsaSecp256k1PrivateKey.key,
      });
      if (ecdsaSecp256k1PublicKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new ECDSAsecp256k1 public key.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        key: ecdsaSecp256k1PrivateKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey, ecdsaSecp256k1PrivateKey.key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated (use raw key for comparison, compressed ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix).
      await retryOnError(() =>
        verifyAccountUpdateKey(accountId, ecdsaSecp256k1PublicKey.key),
      );
    });

    it("(#5) Updates the key of an account to a new valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      // Generate a KeyList of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new KeyList of ED25519 and ECDSAsecp256k1 private and public keys.
      const response = await JSONRPCRequest("updateAccount", {
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
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated.
      await retryOnError(() =>
        verifyAccountUpdateKeyList(accountId, keyList.key),
      );
    });

    it("(#6) Updates the key of an account to a new valid KeyList of nested KeyLists (three levels)", async function () {
      // Generate a KeyList of nested KeyLists of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new KeyList of nested KeyLists.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
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
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated.
      await retryOnError(() =>
        verifyAccountUpdateKeyList(accountId, nestedKeyList.key),
      );
    });

    it("(#7) Updates the key of an account to a new valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      // Generate a ThresholdKey of nested KeyLists of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Attempt to update the key of the account with the new ThresholdKey.
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        key: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            accountPrivateKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account key was updated.
      await retryOnError(() =>
        verifyAccountUpdateKeyList(accountId, thresholdKey.key),
      );
    });

    it("(#8) Updates the key of an account to a key without signing with the new key", async function () {
      // Generate a new key for the account.
      const key = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (key.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      try {
        // Attempt to update the key of the account with the new key. The network should respond with an INVALID_SIGNATURE status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          key: key.key,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#9) Updates the key of an account to a new public key and signs with an incorrect private key", async function () {
      // Generate a new public key for the account.
      const publicKey = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (publicKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Generate a random private key.
      const privateKey = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (privateKey.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      try {
        // Attempt to update the key of the account and sign with the random private key. The network should respond with an INVALID_SIGNATURE status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          key: publicKey.key,
          commonTransactionParams: {
            signers: [privateKey.key],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Period", async function () {
    async function verifyAccountAutoRenewPeriodUpdate(autoRenewPeriodSeconds) {
      // If the account was updated successfully, the queried account's auto renew periods should be equal.
      expect(autoRenewPeriodSeconds).to.equal(
        Number(
          await (
            await consensusInfoClient.getAccountInfo(accountId)
          ).autoRenewPeriod.seconds,
        ),
      );
      expect(autoRenewPeriodSeconds).to.equal(
        await (
          await mirrorNodeClient.getAccountData(accountId)
        ).auto_renew_period,
      );
    }

    it("(#1) Updates the auto-renew period of an account to 60 days (5,184,000 seconds)", async function () {
      // Attempt to update the auto-renew period of the account 60 days.
      const autoRenewPeriodSeconds = 5184000;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        autoRenewPeriod: autoRenewPeriodSeconds,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with an auto-renew period set to 60 days.
      await retryOnError(() =>
        verifyAccountAutoRenewPeriodUpdate(autoRenewPeriodSeconds),
      );
    });

    it("(#2) Updates the auto-renew period of an account to -1 seconds", async function () {
      try {
        // Attempt to update the auto-renew period of the account to -1 seconds. The network should respond with an INVALID_RENEWAL_PERIOD status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          autoRenewPeriod: -1,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Updates the auto-renew period of an account to 30 days (2,592,000 seconds)", async function () {
      // Attempt to update the auto-renew period of the account to 30 days.
      const autoRenewPeriodSeconds = 2592000;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        autoRenewPeriod: autoRenewPeriodSeconds,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with an auto-renew period set to 30 days.
      await retryOnError(() =>
        verifyAccountAutoRenewPeriodUpdate(autoRenewPeriodSeconds),
      );
    });

    it("(#4) Updates the auto-renew period of an account to 30 days minus one second (2,591,999 seconds)", async function () {
      try {
        // Attempt to update the auto-renew period of the account to 2,591,999 seconds. The network should respond with an AUTORENEW_DURATION_NOT_IN_RANGE status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          autoRenewPeriod: 2591999,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Updates the auto-renew period of an account to the maximum period of 8,000,001 seconds", async function () {
      // Attempt to update the auto-renew period of the account to 8,000,001 seconds.
      const autoRenewPeriodSeconds = 8000001;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        autoRenewPeriod: autoRenewPeriodSeconds,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with an auto-renew period set to 8,000,001 seconds.
      await retryOnError(() =>
        verifyAccountAutoRenewPeriodUpdate(autoRenewPeriodSeconds),
      );
    });

    it("(#6) Updates the auto-renew period of an account to the maximum period plus one second (8,000,002 seconds)", async function () {
      try {
        // Attempt to update auto-renew period of the account to 8,000,002 seconds. The network should respond with an AUTORENEW_DURATION_NOT_IN_RANGE status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          autoRenewPeriod: 8000002,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Expiration Time", async function () {
    async function verifyAccountExpirationTimeUpdate(expirationTime) {
      // If the account was updated successfully, the queried account's expiration times should be equal.
      expect(expirationTime).to.equal(
        Number(
          await (
            await consensusInfoClient.getAccountInfo(accountId)
          ).expirationTime.seconds,
        ),
      );
      expect(expirationTime).to.equal(
        Number(
          await (
            await mirrorNodeClient.getAccountData(accountId)
          ).expiry_timestamp,
        ),
      );
    }

    it("(#1) Updates the expiration time of an account to 8,000,001 seconds from the current time", async function () {
      // Attempt to update the expiration time of the account to 8,000,001 seconds from the current time.
      const expirationTimeSeconds = parseInt(Date.now() / 1000 + 8000001);
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        expirationTime: expirationTimeSeconds,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with an expiration time set to 8,000,001 seconds from the current time.
      await retryOnError(() =>
        verifyAccountExpirationTimeUpdate(expirationTimeSeconds),
      );
    });

    it("(#2) Updates the expiration time of an account to -1 seconds", async function () {
      try {
        // Attempt to update the expiration time of the account to -1 seconds. The network should respond with an INVALID_EXPIRATION_TIME status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          expirationTime: -1,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Updates the expiration time of an account to 1 second less than its current expiration time", async function () {
      // Get the account's expiration time.
      const accountInfo = await mirrorNodeClient.getAccountData(accountId);
      const expirationTimeSeconds = await accountInfo.expiry_timestamp;

      // Attempt to update the expiration time to 1 second less than its current expiration time. The network should respond with an EXPIRATION_REDUCTION_NOT_ALLOWED status.
      try {
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          expirationTime: parseInt(Number(expirationTimeSeconds) - 1),
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "EXPIRATION_REDUCTION_NOT_ALLOWED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    /*it("(#4) Updates the expiration time of an account to 8,000,002 seconds from the current time", async function () {
      try {
        // Attempt to update the expiration time of the account to 8,000,002 seconds from the current time. The network should respond with an INVALID_EXPIRATION_TIME status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          expirationTime: Math.floor(Date.now() / 1000) + 8000002,
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });*/
  });

  describe("Receiver Signature Required", async function () {
    async function verifyAccountReceiverSignatureRequiredUpdate(
      receiverSignatureRequired,
    ) {
      // If the account was updated successfully, the queried account's receiver signature required policies should be equal.
      expect(receiverSignatureRequired).to.equal(
        await (
          await consensusInfoClient.getAccountInfo(accountId)
        ).isReceiverSignatureRequired,
      );
      expect(receiverSignatureRequired).to.equal(
        await (
          await mirrorNodeClient.getAccountData(accountId)
        ).receiver_sig_required,
      );
    }

    it("(#1) Updates the receiver signature required policy of an account to require a receiving signature", async function () {
      // Attempt to update the receiver signature required policy of the account to require a signature when receiving.
      const receiverSignatureRequired = true;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        receiverSignatureRequired: receiverSignatureRequired,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account receiver signature required policy was updated.
      await retryOnError(() =>
        verifyAccountReceiverSignatureRequiredUpdate(receiverSignatureRequired),
      );
    });

    it("(#2) Updates the receiver signature required policy of an account to not require a receiving signature", async function () {
      // Attempt to update the receiver signature required policy of the account to not require a signature when receiving.
      const receiverSignatureRequired = false;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        receiverSignatureRequired: receiverSignatureRequired,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account receiver signature required policy was updated.
      await verifyAccountReceiverSignatureRequiredUpdate(
        receiverSignatureRequired,
      );
    });
  });

  describe("Memo", async function () {
    async function verifyAccountMemoUpdate(memo) {
      // If the account was updated successfully, the queried account's memos should be equal.
      expect(memo).to.equal(
        await (
          await consensusInfoClient.getAccountInfo(accountId)
        ).accountMemo,
      );
      expect(memo).to.equal(
        await (
          await mirrorNodeClient.getAccountData(accountId)
        ).memo,
      );
    }

    it("(#1) Updates the memo of an account to a memo that is a valid length", async function () {
      // Attempt to update the memo of the account to a memo that is a valid length.
      const memo = "testmemo";
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        memo: memo,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with the memo set to "testmemo".
      await retryOnError(() => verifyAccountMemoUpdate(memo));
    });

    it("(#2) Updates the memo of an account to a memo that is the minimum length", async function () {
      // Attempt to update the memo of the account with a memo that is the minimum length.
      const memo = "";
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        memo: memo,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with an empty memo.
      await retryOnError(() => verifyAccountMemoUpdate(memo));
    });

    it("(#3) Updates the memo of an account to a memo that is the maximum length", async function () {
      // Attempt to update the memo of the account with a memo that is the maximum length.
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        memo: memo,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the account was updated with the memo set to "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!".
      await retryOnError(() => verifyAccountMemoUpdate(memo));
    });

    it("(#4) Updates the memo of an account to a memo that exceeds the maximum length", async function () {
      try {
        // Attempt to update the memo of the account with a memo that exceeds the maximum length. The network should respond with a MEMO_TOO_LONG status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Max Automatic Token Associations", async function () {
    async function verifyMaxAutoTokenAssociationsUpdate(
      maxAutomaticTokenAssociations,
    ) {
      // If the account was updated successfully, the queried account's max automatic token associations should be equal.
      expect(maxAutomaticTokenAssociations).to.equal(
        Number(
          await (
            await consensusInfoClient.getAccountInfo(accountId)
          ).maxAutomaticTokenAssociations,
        ),
      );
      expect(maxAutomaticTokenAssociations).to.equal(
        Number(
          await (
            await mirrorNodeClient.getAccountData(accountId)
          ).max_automatic_token_associations,
        ),
      );
    }

    it("(#1) Updates the max automatic token associations of an account to a valid amount", async function () {
      // Attempt to update the max automatic token associations of the account to 100.
      const maxAutoTokenAssociations = 100;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        maxAutoTokenAssociations: maxAutoTokenAssociations,
        commonTransactionParams: {
          maxTransactionFee: 100000000000,
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the max auto token associations of the account was updated.
      await retryOnError(() =>
        verifyMaxAutoTokenAssociationsUpdate(maxAutoTokenAssociations),
      );
    });

    it("(#2) Updates the max automatic token associations of an account to the minimum amount", async function () {
      // Attempt to update the max automatic token associations of the account to 0.
      const maxAutoTokenAssociations = 0;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        maxAutoTokenAssociations: maxAutoTokenAssociations,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify max auto token associations of the account was updated.
      await verifyMaxAutoTokenAssociationsUpdate(maxAutoTokenAssociations);
    });

    it("(#3) Updates the max automatic token associations of an account to the maximum amount", async function () {
      // Attempt to update the max automatic token associations of the account to 5000.
      const maxAutoTokenAssociations = 5000;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        maxAutoTokenAssociations: maxAutoTokenAssociations,
        commonTransactionParams: {
          maxTransactionFee: 100000000000,
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify max auto token associations of the account was updated.
      await retryOnError(() =>
        verifyMaxAutoTokenAssociationsUpdate(maxAutoTokenAssociations),
      );
    });

    it("(#4) Updates the max automatic token associations of an account to an amount that exceeds the maximum amount", async function () {
      try {
        // Attempt to update the max automatic token associations of the account to 5001. The network should respond with a REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          maxAutoTokenAssociations: 5001,
          commonTransactionParams: {
            maxTransactionFee: 100000000000,
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
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
    async function verifyAccountStakedAccountIdUpdate(stakedAccountId) {
      // If the account was updated successfully, the queried account's staked account IDs should be equal.
      expect(stakedAccountId.toString()).to.equal(
        await (
          await consensusInfoClient.getAccountInfo(accountId)
        ).stakingInfo.stakedAccountId.toString(),
      );
      expect(stakedAccountId).to.equal(
        await (
          await mirrorNodeClient.getAccountData(accountId)
        ).staked_account_id,
      );
    }

    async function verifyAccountStakedNodeIdUpdate(stakedAccountId) {
      // If the account was updated successfully, the queried account's staked node IDs should be equal.
      expect(stakedAccountId).to.equal(
        Number(
          await (
            await consensusInfoClient.getAccountInfo(accountId)
          ).stakingInfo.stakedNodeId,
        ),
      );
      expect(stakedAccountId).to.equal(
        Number(
          await (
            await mirrorNodeClient.getAccountData(accountId)
          ).staked_account_id,
        ),
      );
    }

    it("(#1) Updates the staked account ID of an account to the operator's account ID", async function () {
      // Attempt to update the staked account ID of the account to the operator's account ID.
      const stakedAccountId = process.env.OPERATOR_ACCOUNT_ID;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        stakedAccountId: stakedAccountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the staked account ID of the account was updated.
      await retryOnError(() =>
        verifyAccountStakedAccountIdUpdate(stakedAccountId),
      );
    });

    it("(#2) Updates the staked node ID of an account to a valid node ID", async function () {
      // Attempt to update the staked node ID of the account to a valid node ID.
      const stakedNodeId = 0;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        stakedNodeId: stakedNodeId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the staked node ID of the account was updated.
      await retryOnError(() => verifyAccountStakedNodeIdUpdate(stakedNodeId));
    });

    it("(#3) Updates the staked account ID of an account to an account ID that doesn't exist", async function () {
      try {
        // Attempt to update the staked account ID of the account to an account ID that doesn't exist. The network should respond with an INVALID_STAKING_ID status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          stakedAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Updates the staked node ID of an account to a node ID that doesn't exist", async function () {
      try {
        // Attempt to update the staked node ID of the account to a node ID that doesn't exist. The network should respond with an INVALID_STAKING_ID status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          stakedNodeId: 123456789,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Updates the staked account ID of an account to an empty account ID", async function () {
      try {
        // Attempt to update the staked account ID of the account to an empty account ID. The SDK should throw an internal error.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          stakedAccountId: "",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Updates the staked node ID of an account to an invalid node ID", async function () {
      try {
        // Attempt to update the staked node ID of the account to an invalid node ID. The network should respond with an INVALID_STAKING_ID status.
        const response = await JSONRPCRequest("updateAccount", {
          accountId: accountId,
          stakedNodeId: -100,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") {
          this.skip();
        }
      } catch (err) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Decline Reward", async function () {
    async function verifyDeclineRewardUpdate(declineRewards) {
      // If the account was updated successfully, the queried account's decline staking rewards policy should be equal.
      expect(declineRewards).to.equal(
        await (
          await consensusInfoClient.getAccountInfo(accountId)
        ).stakingInfo.declineStakingReward,
      );
      expect(declineRewards).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).decline_reward,
      );
    }

    it("(#1) Updates the decline reward policy of an account to decline staking rewards", async function () {
      // Attempt to update the decline reward policy of the account to decline staking rewards.
      const declineStakingRewards = true;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        declineStakingReward: declineStakingRewards,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the decline reward policy of the account was updated.
      await retryOnError(() =>
        verifyDeclineRewardUpdate(declineStakingRewards),
      );
    });

    it("(#2) Updates the decline reward policy of an account to not decline staking rewards", async function () {
      // Attempt to update the decline reward policy of the account to not decline staking rewards.
      const declineStakingRewards = false;
      const response = await JSONRPCRequest("updateAccount", {
        accountId: accountId,
        declineStakingReward: declineStakingRewards,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") {
        this.skip();
      }

      // Verify the decline reward policy of the account was updated.
      await verifyDeclineRewardUpdate(declineStakingRewards);
    });
  });

  return Promise.resolve();
});
