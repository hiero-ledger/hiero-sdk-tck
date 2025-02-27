/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { TimestampRange } from "./TimestampRange";
export type TokenAirdrop = {
  amount: number;
  receiver_id: EntityId;
  sender_id: EntityId;
  serial_number?: number | null;
  timestamp: TimestampRange;
  token_id: EntityId;
};
