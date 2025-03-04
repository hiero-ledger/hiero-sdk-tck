/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { TokenBalance } from "./TokenBalance";
export type AccountBalance = {
  account: EntityId;
  balance: number;
  tokens: Array<TokenBalance>;
};
