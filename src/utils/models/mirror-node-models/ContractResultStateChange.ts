/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { EvmAddress } from "./EvmAddress";
export type ContractResultStateChange = {
  address?: EvmAddress;
  contract_id?: EntityId;
  /**
   * The hex encoded storage slot changed.
   */
  slot?: Blob;
  /**
   * The hex encoded value read from the storage slot.
   */
  value_read?: Blob;
  /**
   * The hex encoded value written to the slot. `null` implies no value written.
   */
  value_written?: Blob | null;
};
