export type HbarAllowanceOverrides = {
  amount?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: Record<string, any>;
};

export type TokenAllowanceOverrides = {
  amount?: string;
  tokenId?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: Record<string, any>;
};

export type NftAllowanceOverrides = {
  tokenId?: string;
  serialNumbers?: string[];
  approvedForAll?: boolean;
  delegateSpenderAccountId?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: Record<string, any>;
};

export type NftConfig = {
  tokenId: string;
  serialNumbers?: string[];
  approvedForAll?: boolean;
  delegateSpenderAccountId?: string;
};

export type HbarAllowanceParamsFactory = (
  overrides?: HbarAllowanceOverrides,
) => any;

export type TokenAllowanceParamsFactory = (
  overrides?: TokenAllowanceOverrides,
) => any;

export type NftAllowanceParamsFactory = (
  overrides?: NftAllowanceOverrides,
) => any;
