/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimestampRange } from "./TimestampRange";
export type Block = {
  count?: number;
  gas_used?: number | null;
  hapi_version?: string | null;
  hash?: string;
  /**
   * A hex encoded 256-byte array with 0x prefix
   */
  logs_bloom?: string | null;
  name?: string;
  number?: number;
  previous_hash?: string;
  size?: number | null;
  timestamp?: TimestampRange;
};
