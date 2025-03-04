/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
export type RoyaltyFee = {
  all_collectors_are_exempt?: boolean;
  amount?: {
    numerator?: number;
    denominator?: number;
  };
  collector_account_id?: EntityId;
  fallback_fee?: {
    amount?: number;
    denominating_token_id?: EntityId;
  };
};
