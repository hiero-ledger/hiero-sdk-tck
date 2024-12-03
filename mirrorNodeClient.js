import axios from "axios";

class MirrorNodeClient {
  constructor() {
    this.mirrorNodeRestUrl = process.env.MIRROR_NODE_REST_URL;
    this.NODE_TIMEOUT = process.env.NODE_TIMEOUT;
  }

  async getAccountData(accountId) {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}`;
    return this.retryUntilData(url);
  }

  async getBalanceData() {
    const url = `${this.mirrorNodeRestUrl}/api/v1/balances`;
    return this.retryUntilData(url);
  }

  async getTokenData(tokenId) {
    const url = `${this.mirrorNodeRestUrl}/api/v1/tokens/${tokenId}`;
    return this.retryUntilData(url);
  }

  async getTokenRelationships(accountId) {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/tokens`;
    return this.retryUntilData(url);
  }

  async retryUntilData(url) {
    const maxRetries = Math.floor(this.NODE_TIMEOUT / 1000); // retry once per second
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(url);

        if (response.data) {
          return response.data;
        }
      } catch (error) {
        // Uncomment if you want to see the error
        // console.error(error);
      }

      // If the array is empty, delay for a second before the next try
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }

    throw new Error("Max retries reached without data");
  }
}

export default new MirrorNodeClient();
