import {
  AccountBalance,
  AccountBalanceQuery,
  AccountId,
  AccountInfo,
  AccountInfoQuery,
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
}

export default new ConsensusInfoClient();
