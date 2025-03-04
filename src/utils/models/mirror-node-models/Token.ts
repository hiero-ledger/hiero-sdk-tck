/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Key } from "./Key";
export type Token = {
  admin_key: Key;
  decimals: number;
  /**
   * Arbitrary binary data associated with this token class encoded in base64.
   */
  metadata?: string;
  name: string;
  symbol: string;
  token_id: EntityId;
  type: string;
};
