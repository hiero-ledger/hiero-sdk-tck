export const TEST_CONFIGURATIONS: Record<string, string> = {
  // Crypto Service Tests
  AccountCreate: "src/tests/crypto-service/test-account-create-transaction.ts",
  AccountUpdate: "src/tests/crypto-service/test-account-update-transaction.ts",
  AccountDelete: "src/tests/crypto-service/test-account-delete-transaction.ts",
  AccountAllowanceDelete:
    "src/tests/crypto-service/test-account-allowance-delete-transaction.ts",
  AccountAllowanceApprove:
    "src/tests/crypto-service/test-account-allowance-approve-transaction.ts",
  // Token Service Tests
  TokenCreate: "src/tests/token-service/test-token-create-transaction.ts",
  TokenUpdate: "src/tests/token-service/test-token-update-transaction.ts",
  TokenDelete: "src/tests/token-service/test-token-delete-transaction.ts",
  TokenBurn: "src/tests/token-service/test-token-burn-transaction.ts",
  TokenMint: "src/tests/token-service/test-token-mint-transaction.ts",
  TokenAssociate: "src/tests/token-service/test-token-associate-transaction.ts",
  TokenDissociate:
    "src/tests/token-service/test-token-dissociate-transaction.ts",
  TokenFeeScheduleUpdate:
    "src/tests/token-service/test-token-fee-schedule-update-transaction.ts",
  TokenGrantKyc: "src/tests/token-service/test-token-grant-kyc-transaction.ts",
  TokenRevokeKyc:
    "src/tests/token-service/test-token-revoke-kyc-transaction.ts",
  TokenPause: "src/tests/token-service/test-token-pause-transaction.ts",
  TokenUnpause: "src/tests/token-service/test-token-unpause-transaction.ts",
  TokenFreeze: "src/tests/token-service/test-token-freeze-transaction.ts",
  TokenUnfreeze: "src/tests/token-service/test-token-unfreeze-transaction.ts",
  ALL: "src/tests/**/*.ts",
};
