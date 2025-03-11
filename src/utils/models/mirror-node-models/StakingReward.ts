/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Timestamp } from "./Timestamp";
export type StakingReward = {
  account_id: EntityId;
  /**
   * The number of tinybars awarded
   */
  amount: number;
  timestamp: Timestamp;
};
