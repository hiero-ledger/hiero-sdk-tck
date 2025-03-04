/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Opcode } from "./Opcode";
export type OpcodesResponse = {
  /**
   * The address of the transaction recipient in hex.
   * Zero address is set for transactions without a recipient (e.g., contract create)
   *
   */
  address: Blob;
  contract_id: EntityId;
  /**
   * Whether the transaction failed to be completely processed.
   */
  failed: boolean;
  /**
   * The gas used in tinybars
   */
  gas: number;
  /**
   * The logs produced by the opcode logger
   */
  opcodes: Array<Opcode>;
  /**
   * The returned data from the transaction in hex
   */
  return_value: Blob;
};
