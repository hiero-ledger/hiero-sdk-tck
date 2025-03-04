/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { EvmAddress } from "./EvmAddress";
import type { Timestamp } from "./Timestamp";
export type ContractState = {
  address: EvmAddress;
  contract_id: EntityId;
  timestamp: Timestamp;
  /**
   * The hex encoded storage slot.
   */
  slot: Blob;
  /**
   * The hex encoded value to the slot. `0x` implies no value written.
   */
  value: Blob;
};
