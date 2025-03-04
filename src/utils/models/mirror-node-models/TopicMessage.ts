/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChunkInfo } from "./ChunkInfo";
import type { EntityId } from "./EntityId";
import type { Timestamp } from "./Timestamp";
export type TopicMessage = {
  chunk_info?: ChunkInfo;
  consensus_timestamp: Timestamp;
  message: string;
  payer_account_id: EntityId;
  running_hash: string;
  running_hash_version: number;
  sequence_number: number;
  topic_id: EntityId;
};
