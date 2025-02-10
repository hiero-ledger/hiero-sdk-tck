/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from './EntityId';
import type { StakingRewardTransfers } from './StakingRewardTransfers';
import type { Timestamp } from './Timestamp';
import type { TimestampNullable } from './TimestampNullable';
import type { TransactionTypes } from './TransactionTypes';
export type Transaction = {
    bytes?: string | null;
    charged_tx_fee?: number;
    consensus_timestamp?: Timestamp;
    entity_id?: EntityId;
    max_fee?: string;
    memo_base64?: string | null;
    name?: TransactionTypes;
    nft_transfers?: Array<{
        is_approval: boolean;
        receiver_account_id: EntityId;
        sender_account_id: EntityId;
        serial_number: number;
        token_id: EntityId;
    }>;
    node?: EntityId;
    nonce?: number;
    parent_consensus_timestamp?: TimestampNullable;
    result?: string;
    scheduled?: boolean;
    staking_reward_transfers?: StakingRewardTransfers;
    token_transfers?: Array<{
        token_id: EntityId;
        account: EntityId;
        amount: number;
        is_approval?: boolean;
    }>;
    transaction_hash?: string;
    transaction_id?: string;
    transfers?: Array<{
        account: EntityId;
        amount: number;
        is_approval?: boolean;
    }>;
    valid_duration_seconds?: string;
    valid_start_timestamp?: Timestamp;
};

