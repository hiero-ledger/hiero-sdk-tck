import {
  AccountBalanceQuery,
  AccountId,
  AccountInfoQuery,
  Client,
  TokenInfoQuery,
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

  async getBalance(accountId: string) {
    return this.executeAccountMethod(accountId, new AccountBalanceQuery());
  }

  async getAccountInfo(accountId: string) {
    return this.executeAccountMethod(accountId, new AccountInfoQuery());
  }

  async getTokenInfo(tokenId: string) {
    return this.executeTokenMethod(tokenId, new TokenInfoQuery());
  }

  async executeAccountMethod(accountId: string, method: any) {
    method.setAccountId(accountId);
    return method.execute(this.sdkClient);
  }

  async executeTokenMethod(tokenId: string, method: any) {
    method.setTokenId(tokenId);
    return method.execute(this.sdkClient);
  }
}

export default new ConsensusInfoClient();
