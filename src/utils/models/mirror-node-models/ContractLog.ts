/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContractResultLog } from "./ContractResultLog";
import type { EntityId } from "./EntityId";
import type { Timestamp } from "./Timestamp";
export type ContractLog = ContractResultLog & {
  /**
   * The hex encoded block (record file chain) hash
   */
  block_hash?: string;
  /**
   * The block height calculated as the number of record files starting from zero since network start.
   */
  block_number?: number;
  root_contract_id?: EntityId;
  timestamp?: Timestamp;
  /**
   * A hex encoded transaction hash
   */
  transaction_hash?: string;
  /**
   * The position of the transaction in the block
   */
  transaction_index?: number | null;
};
