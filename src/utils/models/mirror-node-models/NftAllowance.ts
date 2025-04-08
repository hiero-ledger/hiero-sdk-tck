/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { TimestampRange } from "./TimestampRange";
export type NftAllowance = {
  /**
   * A boolean value indicating if the spender has the allowance to spend all NFTs owned by the given owner
   */
  approved_for_all: boolean;
  owner: EntityId;
  spender: EntityId;
  timestamp: TimestampRange;
  token_id: EntityId;
};
