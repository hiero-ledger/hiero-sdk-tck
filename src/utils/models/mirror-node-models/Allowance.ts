/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { TimestampRange } from "./TimestampRange";
export type Allowance = {
  /**
   * The amount remaining of the original amount granted.
   */
  amount?: number;
  /**
   * The granted amount of the spender's allowance.
   */
  amount_granted?: number;
  owner?: EntityId;
  spender?: EntityId;
  timestamp?: TimestampRange;
};
