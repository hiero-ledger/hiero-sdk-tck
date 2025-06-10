import { fetchData } from "@helpers/fetch-data";
import { retryOnError } from "@helpers/retry-on-error";

import {
  TokenRelationshipResponse,
  AccountInfo,
  CryptoAllowancesResponse,
  NftAllowancesResponse,
  Nfts,
  TokenInfo,
  TokenAirdropsResponse,
} from "@models/mirror-node-models";

class MirrorNodeClient {
  private mirrorNodeRestUrl: string | undefined;
  private mirrorNodeRestJavaUrl: string | undefined;

  constructor() {
    this.mirrorNodeRestUrl = process.env.MIRROR_NODE_REST_URL;
    this.mirrorNodeRestJavaUrl = process.env.MIRROR_NODE_REST_JAVA_URL;
  }

  async getAccountData(accountId: string): Promise<AccountInfo> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getTokenData(tokenId: string): Promise<TokenInfo> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/tokens/${tokenId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getAccountNfts(accountId: string): Promise<Nfts> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/nfts`;

    return retryOnError(async () => fetchData(url));
  }

  async getHbarAllowances(
    accountId: string,
  ): Promise<CryptoAllowancesResponse> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/allowances/crypto`;
    return retryOnError(async () => fetchData(url));
  }

  async getTokenAllowances(
    accountId: string,
  ): Promise<CryptoAllowancesResponse> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/allowances/tokens`;
    return retryOnError(async () => fetchData(url));
  }

  async getNftAllowances(accountId: string): Promise<NftAllowancesResponse> {
    const url = `${this.mirrorNodeRestJavaUrl}/api/v1/accounts/${accountId}/allowances/nfts`;
    return retryOnError(async () => fetchData(url));
  }

  async getTokenRelationships(
    accountId: string,
    tokenId: string,
  ): Promise<TokenRelationshipResponse> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getOutgoingTokenAirdrops(
    accountId: string,
  ): Promise<TokenAirdropsResponse> {
    const url = `${this.mirrorNodeRestJavaUrl}/api/v1/accounts/${accountId}/airdrops/outstanding`;
    return retryOnError(async () => fetchData(url));
  }

  async getIncomingTokenAirdrops(
    accountId: string,
  ): Promise<TokenAirdropsResponse> {
    const url = `${this.mirrorNodeRestJavaUrl}/api/v1/accounts/${accountId}/airdrops/pending`;
    return retryOnError(async () => fetchData(url));
  }
}

export default new MirrorNodeClient();
