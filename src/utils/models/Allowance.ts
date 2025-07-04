export type HbarAllowanceOverrides = {
  amount?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: any;
};

export type TokenAllowanceOverrides = {
  amount?: string;
  tokenId?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: any;
};

export type NftAllowanceOverrides = {
  tokenId?: string;
  serialNumbers?: string[];
  approvedForAll?: boolean;
  delegateSpenderAccountId?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: any;
};

export type NftConfig = {
  tokenId: string;
  serialNumbers?: string[];
  approvedForAll?: boolean;
  delegateSpenderAccountId?: string;
};
