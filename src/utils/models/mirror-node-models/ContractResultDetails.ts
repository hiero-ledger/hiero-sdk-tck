/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContractResult } from "./ContractResult";
import type { ContractResultLogs } from "./ContractResultLogs";
import type { ContractResultStateChanges } from "./ContractResultStateChanges";
export type ContractResultDetails = ContractResult & {
  /**
   * The hex encoded access_list of the wrapped ethereum transaction
   */
  access_list?: string | null;
  /**
   * The hex encoded evm address of contract
   */
  address?: string;
  /**
   * The total amount of gas used in the block
   */
  block_gas_used?: number | null;
  /**
   * The hex encoded block (record file chain) hash
   */
  block_hash?: string | null;
  /**
   * The block height calculated as the number of record files starting from zero since network start.
   */
  block_number?: number | null;
  /**
   * The hex encoded chain_id of the wrapped ethereum transaction
   */
  chain_id?: string | null;
  /**
   * The hex encoded initcode of a failed contract create transaction
   */
  failed_initcode?: string;
  /**
   * The hex encoded gas_price of the wrapped ethereum transaction
   */
  gas_price?: string | null;
  /**
   * The hex encoded transaction hash
   */
  hash?: string;
  logs?: ContractResultLogs;
  /**
   * The hex encoded max_fee_per_gas of the wrapped ethereum transaction
   */
  max_fee_per_gas?: string | null;
  /**
   * The hex encoded max_priority_fee_per_gas of the wrapped ethereum transaction
   */
  max_priority_fee_per_gas?: string | null;
  /**
   * The nonce of the wrapped ethereum transaction
   */
  nonce?: number | null;
  /**
   * The hex encoded signature_r of the wrapped ethereum transaction
   */
  r?: string | null;
  /**
   * The hex encoded signature_s of the wrapped ethereum transaction
   */
  s?: string | null;
  state_changes?: ContractResultStateChanges;
  /**
   * The position of the transaction in the block
   */
  transaction_index?: number | null;
  /**
   * The type of the wrapped ethereum transaction, 0 (Pre-Eip1559) or 2 (Post-Eip1559)
   */
  type?: number | null;
  /**
   * The recovery_id of the wrapped ethereum transaction
   */
  v?: number | null;
};
