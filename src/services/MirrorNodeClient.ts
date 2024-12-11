import { fetchData } from "../utils/helpers/fetch-data";
import { retryOnError } from "../utils/helpers/retry-on-error";

class MirrorNodeClient {
  private mirrorNodeRestUrl: string | undefined;

  constructor() {
    this.mirrorNodeRestUrl = process.env.MIRROR_NODE_REST_URL;
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
  async getTokenRelationships(accountId: string) {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/tokens`;
    return retryOnError(async () => fetchData(url));
  }

  // TODO: Get mirror node interface with OpenAPI
  async getAccountNfts(accountId: string) {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/nfts`;
    return retryOnError(async () => fetchData(url));
  }
}

export default new MirrorNodeClient();
