export const TEST_CONFIGURATIONS: Record<string, string> = {
  // Crypto Service Tests
  AccountAllowanceApprove:
    "src/tests/crypto-service/test-account-allowance-approve-transaction.ts",
  AccountAllowanceDelete:
    "src/tests/crypto-service/test-account-allowance-delete-transaction.ts",
  AccountBalanceQuery:
    "src/tests/crypto-service/test-account-balance-query-transaction.ts",
  AccountCreate: "src/tests/crypto-service/test-account-create-transaction.ts",
  AccountDelete: "src/tests/crypto-service/test-account-delete-transaction.ts",
  AccountUpdate: "src/tests/crypto-service/test-account-update-transaction.ts",
  TransferHbar: "src/tests/crypto-service/test-transfer-hbar-transaction.ts",
  TransferNft: "src/tests/crypto-service/test-transfer-nft-transaction.ts",
  TransferNftApproved:
    "src/tests/crypto-service/test-transfer-nft-approved-transaction.ts",
  TransferToken: "src/tests/crypto-service/test-transfer-token-transaction.ts",
  TransferTokenApproved:
    "src/tests/crypto-service/test-transfer-token-approved-transaction.ts",

  // File Service Tests
  FileAppend: "src/tests/file-service/test-file-append-transaction.ts",
  FileCreate: "src/tests/file-service/test-file-create-transaction.ts",
  FileDelete: "src/tests/file-service/test-file-delete-transaction.ts",
  FileUpdate: "src/tests/file-service/test-file-update-transaction.ts",

  // Topic Service Tests
  TopicCreate: "src/tests/topic-service/test-topic-create-transaction.ts",
  TopicDelete: "src/tests/topic-service/test-topic-delete-transaction.ts",
  TopicMessageSubmit:
    "src/tests/topic-service/test-topic-message-submit-transaction.ts",
  TopicUpdate: "src/tests/topic-service/test-topic-update-transaction.ts",

  // Contract Service Tests
  ContractCreate:
    "src/tests/contract-service/test-contract-create-transaction.ts",
  ContractUpdate:
    "src/tests/contract-service/test-contract-update-transaction.ts",
  ContractDelete:
    "src/tests/contract-service/test-contract-delete-transaction.ts",
  ContractExecute:
    "src/tests/contract-service/test-contract-execute-transaction.ts",

  // Schedule Service Tests
  ScheduleCreate:
    "src/tests/schedule-service/test-schedule-create-transaction.ts",
  ScheduleDelete:
    "src/tests/schedule-service/test-schedule-delete-transaction.ts",
  ScheduleSign: "src/tests/schedule-service/test-schedule-sign-transaction.ts",

  // Node Service Tests
  NodeCreate: "src/tests/node-service/test-node-create-transaction.ts",
  NodeUpdate: "src/tests/node-service/test-node-update-transaction.ts",
  NodeDelete: "src/tests/node-service/test-node-delete-transaction.ts",

  // Token Service Tests
  TokenAirdropCancel:
    "src/tests/token-service/test-token-airdrop-cancel-transaction.ts",
  TokenAirdropClaim:
    "src/tests/token-service/test-token-airdrop-claim-transaction.ts",
  TokenAirdrop: "src/tests/token-service/test-token-airdrop-transaction.ts",
  TokenAssociate: "src/tests/token-service/test-token-associate-transaction.ts",
  TokenBurn: "src/tests/token-service/test-token-burn-transaction.ts",
  TokenCreate: "src/tests/token-service/test-token-create-transaction.ts",
  TokenDelete: "src/tests/token-service/test-token-delete-transaction.ts",
  TokenDissociate:
    "src/tests/token-service/test-token-dissociate-transaction.ts",
  TokenFeeScheduleUpdate:
    "src/tests/token-service/test-token-fee-schedule-update-transaction.ts",
  TokenFreeze: "src/tests/token-service/test-token-freeze-transaction.ts",
  TokenGrantKyc: "src/tests/token-service/test-token-grant-kyc-transaction.ts",
  TokenMint: "src/tests/token-service/test-token-mint-transaction.ts",
  TokenPause: "src/tests/token-service/test-token-pause-transaction.ts",
  TokenReject: "src/tests/token-service/test-token-reject-transaction.ts",
  TokenRevokeKyc:
    "src/tests/token-service/test-token-revoke-kyc-transaction.ts",
  TokenUnfreeze: "src/tests/token-service/test-token-unfreeze-transaction.ts",
  TokenUnpause: "src/tests/token-service/test-token-unpause-transaction.ts",
  TokenUpdate: "src/tests/token-service/test-token-update-transaction.ts",
  TokenWipe: "src/tests/token-service/test-token-wipe-transaction.ts",

  // Ethereum Tests
  EthereumTransaction: "src/tests/ethereum/test-ethereum-transaction.ts",

  ALL: "src/tests/**/*.ts",
};
