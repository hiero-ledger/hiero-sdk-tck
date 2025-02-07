/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from './EntityId';
import type { EvmAddress } from './EvmAddress';
import type { Key } from './Key';
import type { TimestampNullable } from './TimestampNullable';
import type { TimestampRange } from './TimestampRange';
export type Contract = {
    admin_key?: Key;
    auto_renew_account?: EntityId;
    auto_renew_period?: number | null;
    contract_id?: EntityId;
    created_timestamp?: TimestampNullable;
    deleted?: boolean;
    evm_address?: EvmAddress;
    expiration_timestamp?: TimestampNullable;
    file_id?: EntityId;
    max_automatic_token_associations?: number | null;
    memo?: string;
    obtainer_id?: EntityId;
    permanent_removal?: boolean | null;
    proxy_account_id?: EntityId;
    timestamp?: TimestampRange;
};

