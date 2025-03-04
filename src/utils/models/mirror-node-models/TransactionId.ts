/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Timestamp } from "./Timestamp";
export type TransactionId = {
  account_id?: EntityId;
  nonce?: number | null;
  scheduled?: boolean | null;
  transaction_valid_start?: Timestamp;
};
