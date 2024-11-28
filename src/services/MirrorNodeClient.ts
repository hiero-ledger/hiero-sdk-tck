import { fetchData } from "../utils/helpers/fetch-data";
import { retryOnError } from "../utils/helpers/retry-on-error";

class MirrorNodeClient {
  private mirrorNodeRestUrl: string | undefined;

  constructor() {
    this.mirrorNodeRestUrl = process.env.MIRROR_NODE_REST_URL;
  }

  async getAccountData(accountId: string): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getBalanceData(): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/balances`;
    return retryOnError(async () => fetchData(url));
  }

  async getTokenData(tokenId: string): Promise<any> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/tokens/${tokenId}`;
    return retryOnError(async () => fetchData(url));
  }
}

export default new MirrorNodeClient();
