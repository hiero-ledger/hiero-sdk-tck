/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Bloom } from "./Bloom";
import type { EntityId } from "./EntityId";
import type { EvmAddressNullable } from "./EvmAddressNullable";
import type { Timestamp } from "./Timestamp";
export type ContractResult = {
  /**
   * The hex encoded access_list of the wrapped ethereum transaction
   */
  access_list?: string | null;
  /**
   * The hex encoded evm address of contract
   */
  address?: string;
  /**
   * The number of tinybars sent to the function
   */
  amount?: number | null;
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
  bloom?: Bloom;
  /**
   * The hex encoded result returned by the function
   */
  call_result?: string | null;
  /**
   * The hex encoded chain_id of the wrapped ethereum transaction
   */
  chain_id?: string | null;
  contract_id?: EntityId;
  /**
   * The list of smart contracts that were created by the function call.
   */
  created_contract_ids?: Array<EntityId> | null;
  /**
   * The message when an error occurs during smart contract execution
   */
  error_message?: string | null;
  /**
   * The hex encoded initcode of a failed contract create transaction
   */
  failed_initcode?: string;
  from?: EvmAddressNullable;
  /**
   * The hex encoded parameters passed to the function
   */
  function_parameters?: string | null;
  /**
   * The units of consumed gas by the EVM to execute contract
   */
  gas_consumed?: number | null;
  /**
   * The maximum units of gas allowed for contract execution
   */
  gas_limit?: number;
  /**
   * The hex encoded gas_price of the wrapped ethereum transaction
   */
  gas_price?: string | null;
  /**
   * The units of gas used to execute contract
   */
  gas_used?: number | null;
  /**
   * A hex encoded 32 byte hash and it is only populated for Ethereum transaction case
   */
  hash?: string;
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
   * The result of the transaction
   */
  result?: string;
  /**
   * The hex encoded signature_s of the wrapped ethereum transaction
   */
  s?: string | null;
  /**
   * The status of the transaction, 0x1 for a SUCCESS transaction and 0x0 for all else
   */
  status?: string;
  timestamp?: Timestamp;
  to?: EvmAddressNullable;
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
