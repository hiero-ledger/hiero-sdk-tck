/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Key } from "./Key";
import type { ScheduleSignature } from "./ScheduleSignature";
import type { Timestamp } from "./Timestamp";
import type { TimestampNullable } from "./TimestampNullable";
export type Schedule = {
  admin_key?: Key;
  consensus_timestamp?: Timestamp;
  creator_account_id?: EntityId;
  deleted?: boolean;
  executed_timestamp?: TimestampNullable;
  expiration_time?: TimestampNullable;
  memo?: string;
  payer_account_id?: EntityId;
  schedule_id?: EntityId;
  signatures?: Array<ScheduleSignature>;
  transaction_body?: string;
  wait_for_expiry?: boolean;
};
