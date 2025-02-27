/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { TimestampNullable } from "./TimestampNullable";
export type Balance = {
  timestamp: TimestampNullable;
  balance: number | null;
  tokens: Array<{
    token_id?: EntityId;
    balance?: number;
  }>;
};
