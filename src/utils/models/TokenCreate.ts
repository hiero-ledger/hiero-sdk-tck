export interface TokenCreateParams {
  name?: string;
  symbol?: string;
  treasuryAccountId?: string;
  tokenType?: "ft" | "nft";
  initialSupply?: string;
  decimals?: number;
  adminKey?: string;
  kycKey?: string;
  freezeKey?: string;
  wipeKey?: string;
  supplyKey?: string;
  pauseKey?: string;
  feeScheduleKey?: string;
  memo?: string;
  maxSupply?: string;
  supplyType?: "infinite" | "finite";
  freezeDefault?: boolean;
  expirationTime?: string;
  autoRenewAccountId?: string;
  autoRenewPeriod?: string;
  customFees?: any[];
  commonTransactionParams?: {
    signers?: string[];
  };
}
