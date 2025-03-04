/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
/**
 * A staking reward transfer
 */
export type StakingRewardTransfer = {
  account: EntityId;
  /**
   * The number of tinybars awarded
   */
  amount: number;
};
