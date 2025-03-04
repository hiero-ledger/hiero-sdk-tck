/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FixedFee } from "./FixedFee";
import type { FractionalFee } from "./FractionalFee";
import type { RoyaltyFee } from "./RoyaltyFee";
import type { Timestamp } from "./Timestamp";
export type CustomFees = {
  created_timestamp?: Timestamp;
  fixed_fees?: Array<FixedFee>;
  fractional_fees?: Array<FractionalFee>;
  royalty_fees?: Array<RoyaltyFee>;
};
