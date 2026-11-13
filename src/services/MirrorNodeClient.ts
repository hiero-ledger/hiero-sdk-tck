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
    // Current mirror node versions serve /api/v1/network/nodes from the rest-java
    // module; older versions serve it from the rest module. Try rest-java first and
    // fall back so the TCK works across mirror node versions.
    const url = `${this.mirrorNodeRestJavaUrl}/api/v1/network/nodes?node.id=${nodeId}`;
    const legacyUrl = `${this.mirrorNodeRestUrl}/api/v1/network/nodes?node.id=${nodeId}`;
    return retryOnError(async () =>
      fetchData(url).catch(() => fetchData(legacyUrl)),
    );
  }

  /**
   * Counts successful transactions of the given type (e.g. "NODECREATE")
   * with a consensus timestamp at or after `sinceSeconds`, following
   * pagination. Used by the post-run node-pollution check (issue #667):
   * /network/nodes only reflects the address book file, which regenerates on
   * upgrades, so freshly created nodes are invisible there — the transaction
   * stream is the only prompt REST view of node churn.
   */
  async countSuccessfulTransactions(
    transactionType: string,
    sinceSeconds: number,
  ): Promise<number> {
    const baseUrl = this.mirrorNodeRestUrl!;
    // Promise<any> because retryOnError's fn parameter is typed () => Promise<void>.
    return retryOnError(async (): Promise<any> => {
      // count/path live inside the closure so a retry restarts from scratch
      let count = 0;
      let path: string | null =
        `/api/v1/transactions?transactiontype=${transactionType}&result=success&timestamp=gte:${sinceSeconds}&limit=100`;
      while (path) {
        const page: any = await fetchData(new URL(path, baseUrl).toString());
        count += page.transactions.length;
        path = page.links?.next ?? null;
      }
      return count;
    });
  }

  /**
   * Returns the node IDs of every node in the network's address book,
   * following pagination. Used for the informational baseline stamp in
   * run-info.json (issue #667). NOTE: reflects the address book file only —
   * nodes created since the last upgrade/freeze do not appear here.
   */
  async getAllNetworkNodeIds(): Promise<string[]> {
    const baseUrl = this.mirrorNodeRestJavaUrl ?? this.mirrorNodeRestUrl;
    const legacyBaseUrl = this.mirrorNodeRestUrl;

    // Promise<any> because retryOnError's fn parameter is typed () => Promise<void>.
    const listFrom = async (base: string): Promise<any> => {
      const nodeIds: string[] = [];
      let path: string | null = "/api/v1/network/nodes?limit=100";
      while (path) {
        const page: NetworkNodesResponse = await fetchData(
          new URL(path, base).toString(),
        );
        nodeIds.push(...page.nodes.map((node) => String(node.node_id)));
        path = page.links?.next ?? null;
      }
      return nodeIds;
    };

    return retryOnError(async () =>
      listFrom(baseUrl!).catch(() => listFrom(legacyBaseUrl!)),
    );
  }
}

export default new MirrorNodeClient();
