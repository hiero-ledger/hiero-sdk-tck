import {
  AccountBalance,
  AccountBalanceQuery,
  AccountId,
  AccountInfo,
  AccountInfoQuery,
  AddressBookQuery,
  Client,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractFunctionResult,
  ContractId,
  ContractInfo,
  ContractInfoQuery,
  FileContentsQuery,
  FileId,
  FileInfo,
  FileInfoQuery,
  NftId,
  ScheduleId,
  ScheduleInfo,
  ScheduleInfoQuery,
  TokenInfo,
  TokenInfoQuery,
  TokenNftInfo,
  TokenNftInfoQuery,
  TopicId,
  TopicInfo,
  TopicInfoQuery,
  TransactionId,
  TransactionReceipt,
  TransactionReceiptQuery,
} from "@hashgraph/sdk";

class ConsensusInfoClient {
  // Lazily created so the client (and its gRPC channels) only exists while
  // tests need it, and can be closed and re-created between test files.
  // See https://github.com/hiero-ledger/hiero-sdk-tck/issues/645.
  private _sdkClient: Client | null = null;

  get sdkClient(): Client {
    this._sdkClient ??= this.createClient();
    return this._sdkClient;
  }

  private createClient(): Client {
    let sdkClient;
    if (process.env.NODE_IP && process.env.NODE_ACCOUNT_ID) {
      const node = {
        [process.env.NODE_IP]: AccountId.fromString(
          process.env.NODE_ACCOUNT_ID,
        ),
      };
      sdkClient = Client.forNetwork(node);
      // Set mirror network for AddressBookQuery support
      // AddressBookQuery requires mirror network to be configured
      if (process.env.MIRROR_NETWORK) {
        const mirrorNetwork = process.env.MIRROR_NETWORK.split(",").map(
          (addr) => addr.trim(),
        );
        sdkClient.setMirrorNetwork(mirrorNetwork);
      } else {
        // Default mirror network for local development
        sdkClient.setMirrorNetwork(["127.0.0.1:5600"]);
      }
    } else {
      sdkClient = Client.forLocalNode();
      sdkClient.setMirrorNetwork(["127.0.0.1:5600"]);
    }

    sdkClient.setOperator(
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    return sdkClient;
  }

  // Closes the underlying SDK client and its network channels. The next
  // sdkClient access transparently creates a fresh client.
  async close(): Promise<void> {
    if (this._sdkClient !== null) {
      const client = this._sdkClient;
      this._sdkClient = null;
      await client.close();
    }
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

  async getFileInfo(fileId: string): Promise<FileInfo> {
    const query = new FileInfoQuery();
    query.setFileId(FileId.fromString(fileId));
    return query.execute(this.sdkClient);
  }

  async getFileContents(fileId: string): Promise<Uint8Array> {
    const query = new FileContentsQuery();
    query.setFileId(FileId.fromString(fileId));
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

  async getTopicInfo(topicId: string): Promise<TopicInfo> {
    return this.executeTopicMethod(topicId, new TopicInfoQuery());
  }

  async executeTopicMethod(topicId: string, method: TopicInfoQuery) {
    method.setTopicId(TopicId.fromString(topicId));
    return method.execute(this.sdkClient);
  }

  async getContractInfo(contractId: string): Promise<ContractInfo> {
    const query = new ContractInfoQuery();
    query.setContractId(ContractId.fromString(contractId));
    return query.execute(this.sdkClient);
  }

  async getScheduleInfo(scheduleId: string): Promise<ScheduleInfo> {
    const query = new ScheduleInfoQuery();
    query.setScheduleId(ScheduleId.fromString(scheduleId));
    return query.execute(this.sdkClient);
  }

  async getTransactionReceipt(
    transactionId: string,
  ): Promise<TransactionReceipt> {
    const query = new TransactionReceiptQuery();
    query
      .setValidateStatus(false)
      .setTransactionId(TransactionId.fromString(transactionId));
    return query.execute(this.sdkClient);
  }

  async getContractFunctionResult(
    contractId: string,
    functionName: string,
  ): Promise<ContractFunctionResult> {
    const query = new ContractCallQuery();
    const functionParameters = new ContractFunctionParameters()._build(
      functionName,
    );

    query.setContractId(ContractId.fromString(contractId));
    query.setFunctionParameters(functionParameters);
    query.setGas(100000);

    return query.execute(this.sdkClient);
  }

  async getContractBalance(
    contractId: string,
  ): Promise<ContractFunctionResult> {
    const query = new ContractCallQuery();
    const functionParameters = new ContractFunctionParameters()._build(
      "getContractBalance",
    );
    query.setContractId(ContractId.fromString(contractId));
    query.setFunctionParameters(functionParameters);
    query.setGas(100000);

    return query.execute(this.sdkClient);
  }

  async getNodeInfo(nodeId: string): Promise<any> {
    const query = new AddressBookQuery();
    query.setFileId("0.0.102"); // Address book file ID is always 0.0.102
    const addressBook = await query.execute(this.sdkClient);

    // Find the node with the specified node ID
    const node = addressBook.nodeAddresses.find(
      (nodeAddress) => nodeAddress.nodeId?.toString() === nodeId,
    );

    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found in address book`);
    }

    return node;
  }

  async getAddressBook(fileId?: string, limit?: number): Promise<any> {
    const query = new AddressBookQuery();
    if (fileId !== null && fileId !== undefined) {
      query.setFileId(FileId.fromString(fileId));
    }
    if (limit !== null && limit !== undefined) {
      query.setLimit(limit);
    }
    return query.execute(this.sdkClient);
  }
}

export default new ConsensusInfoClient();
