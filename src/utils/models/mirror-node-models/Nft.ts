/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from './EntityId';
import type { TimestampNullable } from './TimestampNullable';
export type Nft = {
    account_id?: EntityId;
    created_timestamp?: TimestampNullable;
    delegating_spender?: EntityId;
    /**
     * whether the nft or the token it belongs to has been deleted
     */
    deleted?: boolean;
    /**
     * Arbitrary binary data associated with this NFT encoded in base64.
     */
    metadata?: string;
    modified_timestamp?: TimestampNullable;
    serial_number?: number;
    spender?: EntityId;
    token_id?: EntityId;
};

