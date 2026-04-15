import { fetchData } from "@helpers/fetch-data";
import { retryOnError } from "@helpers/retry-on-error";

import {
  TokenRelationshipResponse,
  AccountInfo,
  Contract,
  CryptoAllowancesResponse,
  NftAllowancesResponse,
  Nfts,
  Nft,
  TokenInfo,
  TokenAirdropsResponse,
  Topic,
  TopicMessagesResponse,
  NetworkNodesResponse,
  Schedule,
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

  async getTopicData(topicId: string): Promise<Topic> {
    const url = `${this.mirrorNodeRestJavaUrl}/api/v1/topics/${topicId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getTopicMessages(topicId: string): Promise<TopicMessagesResponse> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/topics/${topicId}/messages`;
    return retryOnError(async () => fetchData(url));
  }

  async getScheduleData(scheduleId: string): Promise<Schedule> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/schedules/${scheduleId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getAccountNfts(accountId: string): Promise<Nfts> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/accounts/${accountId}/nfts`;

    return retryOnError(async () => fetchData(url));
  }

  async getNftInfo(tokenId: string, serialNumber: string): Promise<Nft> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/tokens/${tokenId}/nfts/${serialNumber}`;
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

  async getContractData(contractId: string): Promise<Contract> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/contracts/${contractId}`;
    return retryOnError(async () => fetchData(url));
  }

  async getNodeData(nodeId: string): Promise<NetworkNodesResponse> {
    const url = `${this.mirrorNodeRestUrl}/api/v1/network/nodes?node.id=${nodeId}`;
    return retryOnError(async () => fetchData(url));
  }
}

export default new MirrorNodeClient();
