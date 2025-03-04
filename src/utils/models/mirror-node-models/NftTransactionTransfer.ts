/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Timestamp } from "./Timestamp";
import type { TransactionTypes } from "./TransactionTypes";
export type NftTransactionTransfer = {
  consensus_timestamp: Timestamp;
  is_approval: boolean;
  nonce: number;
  receiver_account_id: EntityId;
  sender_account_id: EntityId;
  transaction_id: string;
  type: TransactionTypes;
};
