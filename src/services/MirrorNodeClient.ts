import { fetchData } from "@helpers/fetch-data";
import { retryOnError } from "@helpers/retry-on-error";

class MirrorNodeClient {
  private mirrorNodeRestUrl: string | undefined;
  private mirrorNodeRestJavaUrl: string | undefined;

  constructor() {
    this.mirrorNodeRestUrl = process.env.MIRROR_NODE_REST_URL;
    this.mirrorNodeRestJavaUrl = process.env.MIRROR_NODE_REST_JAVA_URL;
  }

  // TODO: Get mirror node interface with OpenAPI
  async getAccountData(accountId: string): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getBalanceData(): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/balances`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getTokenData(tokenId: string): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/tokens/${tokenId}`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getAccountNfts(accountId: string, tokenId: string) {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/nfts?token.id=${tokenId}`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getHbarAllowances(accountId: string): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/allowances/crypto`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getTokenAllowances(accountId: string): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/allowances/tokens`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getNftAllowances(accountId: string): Promise<any> {
    const url = `${this.mirrorNodeRestJavaUrl}/api/v1/accounts/${accountId}/allowances/nfts`;
    return retryOnError(async () => fetchData(url));
  }
  async getTokenRelationships(
    accountId: string,
    tokenId: string,
  ): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
    return retryOnError(async () => fetchData(url));
  }
}

export default new MirrorNodeClient();
