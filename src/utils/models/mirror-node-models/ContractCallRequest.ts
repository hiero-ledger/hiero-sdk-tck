/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ContractCallRequest = {
  /**
   * Hexadecimal block number or the string "latest", "pending", "earliest". Defaults to "latest".
   */
  block?: string | null;
  /**
   * Hexadecimal method signature and encoded parameters. Up to 24656 bytes as at most 49152 hexidecimal digits plus optional leading 0x.
   */
  data?: Blob | null;
  /**
   * Whether gas estimation is called. Defaults to false.
   */
  estimate?: boolean | null;
  /**
   * The 20-byte hexadecimal EVM address the transaction is sent from.
   */
  from?: Blob | null;
  /**
   * Gas provided for the transaction execution. Defaults to 15000000.
   */
  gas?: number | null;
  /**
   * Gas price used for each paid gas.
   */
  gasPrice?: number | null;
  /**
   * The 20-byte hexadecimal EVM address the transaction is directed to.
   */
  to: Blob;
  /**
   * Value sent with this transaction. Defaults to 0.
   */
  value?: number | null;
};
