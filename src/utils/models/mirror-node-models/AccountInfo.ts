/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Alias } from "./Alias";
import type { Balance } from "./Balance";
import type { EntityId } from "./EntityId";
import type { EvmAddressNullable } from "./EvmAddressNullable";
import type { Key } from "./Key";
import type { TimestampNullable } from "./TimestampNullable";
export type AccountInfo = {
  account: EntityId;
  alias: Alias;
  auto_renew_period: number | null;
  balance: Balance;
  created_timestamp: TimestampNullable;
  /**
   * Whether the account declines receiving a staking reward
   */
  decline_reward: boolean;
  deleted: boolean | null;
  ethereum_nonce: number | null;
  evm_address: EvmAddressNullable;
  expiry_timestamp: TimestampNullable;
  key: Key;
  max_automatic_token_associations: number | null;
  memo: string | null;
  /**
   * The pending reward in tinybars the account will receive in the next reward payout. Note the value is updated
   * at the end of each staking period and there may be delay to reflect the changes in the past staking period.
   *
   */
  pending_reward?: number;
  receiver_sig_required: boolean | null;
  staked_account_id: EntityId;
  /**
   * The id of the node to which this account is staking
   */
  staked_node_id: number | null;
  stake_period_start: TimestampNullable;
};
