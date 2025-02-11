/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from './EntityId';
import type { Key } from './Key';
import type { TimestampNullable } from './TimestampNullable';
import type { TimestampRange } from './TimestampRange';
export type Topic = {
    admin_key: Key;
    auto_renew_account: EntityId;
    /**
     * The amount of time to attempt to extend the topic's lifetime after expiration.
     */
    auto_renew_period: number | null;
    created_timestamp: TimestampNullable;
    /**
     * Whether the topic is deleted or not.
     */
    deleted: boolean | null;
    /**
     * The memo associated with the topic.
     */
    memo: string;
    submit_key: Key;
    timestamp: TimestampRange;
    topic_id: EntityId;
};

