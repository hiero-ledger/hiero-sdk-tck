/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CustomFees } from './CustomFees';
import type { EntityId } from './EntityId';
import type { Key } from './Key';
import type { Timestamp } from './Timestamp';
export type TokenInfo = {
    admin_key?: Key;
    auto_renew_account?: EntityId;
    auto_renew_period?: number | null;
    created_timestamp?: Timestamp;
    decimals?: string;
    deleted?: boolean | null;
    expiry_timestamp?: number | null;
    fee_schedule_key?: Key;
    freeze_default?: boolean;
    freeze_key?: Key;
    initial_supply?: string;
    kyc_key?: Key;
    max_supply?: string;
    /**
     * Arbitrary binary data associated with this token class encoded in base64.
     */
    metadata?: string;
    metadata_key?: Key;
    modified_timestamp?: Timestamp;
    name?: string;
    memo?: string;
    pause_key?: Key;
    pause_status?: TokenInfo.pause_status;
    supply_key?: Key;
    supply_type?: TokenInfo.supply_type;
    symbol?: string;
    token_id?: EntityId;
    total_supply?: string;
    treasury_account_id?: EntityId;
    type?: TokenInfo.type;
    wipe_key?: Key;
    custom_fees?: CustomFees;
};
export namespace TokenInfo {
    export enum pause_status {
        NOT_APPLICABLE = 'NOT_APPLICABLE',
        PAUSED = 'PAUSED',
        UNPAUSED = 'UNPAUSED',
    }
    export enum supply_type {
        FINITE = 'FINITE',
        INFINITE = 'INFINITE',
    }
    export enum type {
        FUNGIBLE_COMMON = 'FUNGIBLE_COMMON',
        NON_FUNGIBLE_UNIQUE = 'NON_FUNGIBLE_UNIQUE',
    }
}

