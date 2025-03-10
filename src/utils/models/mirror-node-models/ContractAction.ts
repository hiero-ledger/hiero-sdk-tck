/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { EvmAddressNullable } from "./EvmAddressNullable";
import type { Timestamp } from "./Timestamp";
export type ContractAction = {
  /**
   * The nesting depth of the call
   */
  call_depth?: number;
  /**
   * The type of the call operation
   */
  call_operation_type?: ContractAction.call_operation_type;
  /**
   * The type of the call
   */
  call_type?: ContractAction.call_type;
  caller?: EntityId;
  /**
   * The entity type of the caller
   */
  caller_type?: ContractAction.caller_type;
  /**
   * The EVM address of the caller
   */
  from?: string;
  /**
   * Gas cost in tinybars
   */
  gas?: number;
  /**
   * Gas used in tinybars
   */
  gas_used?: number;
  /**
   * The position of the action within the ordered list of actions
   */
  index?: number;
  /**
   * The hex encoded input data
   */
  input?: string | null;
  recipient?: EntityId;
  /**
   * The entity type of the recipient
   */
  recipient_type?: ContractAction.recipient_type | null;
  /**
   * The hex encoded result data
   */
  result_data?: string | null;
  /**
   * The type of the result data
   */
  result_data_type?: ContractAction.result_data_type;
  timestamp?: Timestamp;
  to?: EvmAddressNullable;
  /**
   * The value of the transaction in tinybars
   */
  value?: number;
};
export namespace ContractAction {
  /**
   * The type of the call operation
   */
  export enum call_operation_type {
    CALL = "CALL",
    CALLCODE = "CALLCODE",
    CREATE = "CREATE",
    CREATE2 = "CREATE2",
    DELEGATECALL = "DELEGATECALL",
    STATICCALL = "STATICCALL",
    UNKNOWN = "UNKNOWN",
  }
  /**
   * The type of the call
   */
  export enum call_type {
    NO_ACTION = "NO_ACTION",
    CALL = "CALL",
    CREATE = "CREATE",
    PRECOMPILE = "PRECOMPILE",
    SYSTEM = "SYSTEM",
  }
  /**
   * The entity type of the caller
   */
  export enum caller_type {
    ACCOUNT = "ACCOUNT",
    CONTRACT = "CONTRACT",
  }
  /**
   * The entity type of the recipient
   */
  export enum recipient_type {
    ACCOUNT = "ACCOUNT",
    CONTRACT = "CONTRACT",
  }
  /**
   * The type of the result data
   */
  export enum result_data_type {
    OUTPUT = "OUTPUT",
    REVERT_REASON = "REVERT_REASON",
    ERROR = "ERROR",
  }
}
