/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimestampRange } from "./TimestampRange";
export type NetworkStakeResponse = {
  /**
   * The maximum amount of tinybar that can be staked for reward while still achieving
   * the maximum per-hbar reward rate
   *
   */
  max_stake_rewarded: number;
  /**
   * The maximum reward rate, in tinybars per whole hbar, that any account can receive in a day
   */
  max_staking_reward_rate_per_hbar: number;
  /**
   * The total tinybars to be paid as staking rewards in the ending period,
   * after applying the settings for the 0.0.800 balance threshold and the maximum stake rewarded
   *
   */
  max_total_reward: number;
  /**
   * The fraction between zero and one of the network and service fees paid to the node reward account 0.0.801
   */
  node_reward_fee_fraction: number;
  /**
   * The amount of the staking reward funds of account 0.0.800 reserved to pay pending
   * rewards that have been earned but not collected
   *
   */
  reserved_staking_rewards: number;
  /**
   * The unreserved tinybar balance of account 0.0.800 required to achieve the
   * maximum per-hbar reward rate
   *
   */
  reward_balance_threshold: number;
  /**
   * The total amount staked to the network in tinybars the start of the current staking period
   */
  stake_total: number;
  staking_period: TimestampRange;
  /**
   * The number of minutes in a staking period
   */
  staking_period_duration: number;
  /**
   * The number of staking periods for which the reward is stored for each node
   */
  staking_periods_stored: number;
  /**
   * The fraction between zero and one of the network and service fees paid to the staking reward account 0.0.800
   */
  staking_reward_fee_fraction: number;
  /**
   * The total number of tinybars to be distributed as staking rewards each period
   */
  staking_reward_rate: number;
  /**
   * The minimum balance of staking reward account 0.0.800 required to active rewards
   */
  staking_start_threshold: number;
  /**
   * The unreserved balance of account 0.0.800 at the close of the just-ending period;
   * this value is used to compute the HIP-782 balance ratio
   *
   */
  unreserved_staking_reward_balance: number;
};
