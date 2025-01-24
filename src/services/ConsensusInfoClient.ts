import {
  AccountBalance,
  AccountBalanceQuery,
  AccountId,
  AccountInfo,
  AccountInfoQuery,
  Client,
  NftId,
  TokenInfo,
  TokenInfoQuery,
  TokenNftInfo,
  TokenNftInfoQuery,
} from "@hashgraph/sdk";

class ConsensusInfoClient {
  sdkClient;
  constructor() {
    if (
      process.env.NODE_IP &&
      process.env.NODE_ACCOUNT_ID &&
      process.env.MIRROR_NETWORK
    ) {
      const node = {
        [process.env.NODE_IP]: AccountId.fromString(
          process.env.NODE_ACCOUNT_ID,
        ),
      };
      this.sdkClient = Client.forNetwork(node);
    } else {
      this.sdkClient = Client.forTestnet();
    }

    this.sdkClient.setOperator(
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  }

  async getBalance(accountId: string): Promise<AccountBalance> {
    return this.executeAccountMethod(
      accountId,
      new AccountBalanceQuery(),
    ) as Promise<AccountBalance>;
  }

  async getAccountInfo(accountId: string): Promise<AccountInfo> {
    return this.executeAccountMethod(
      accountId,
      new AccountInfoQuery(),
    ) as Promise<AccountInfo>;
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    return this.executeTokenMethod(tokenId, new TokenInfoQuery());
  }

  async getTokenNftInfo(
    tokenId: string,
    serialNumber: string,
  ): Promise<TokenNftInfo[]> {
    const query = new TokenNftInfoQuery();
    query.setNftId(NftId.fromString(tokenId + "/" + serialNumber));
    return query.execute(this.sdkClient);
  }

  async executeAccountMethod(
    accountId: string,
    method: AccountInfoQuery | AccountBalanceQuery,
  ) {
    method.setAccountId(accountId);
    return method.execute(this.sdkClient);
  }

  async executeTokenMethod(tokenId: string, method: TokenInfoQuery) {
    method.setTokenId(tokenId);
    return method.execute(this.sdkClient);
  }
}

export default new ConsensusInfoClient();
