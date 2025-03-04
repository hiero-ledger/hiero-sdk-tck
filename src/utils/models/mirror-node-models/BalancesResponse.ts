/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountBalance } from "./AccountBalance";
import type { Links } from "./Links";
import type { TimestampNullable } from "./TimestampNullable";
export type BalancesResponse = {
  timestamp?: TimestampNullable;
  balances?: Array<AccountBalance>;
  links?: Links;
};
