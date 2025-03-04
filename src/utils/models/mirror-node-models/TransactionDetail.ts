/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssessedCustomFee } from "./AssessedCustomFee";
import type { Transaction } from "./Transaction";
export type TransactionDetail = Transaction & {
  assessed_custom_fees?: Array<AssessedCustomFee>;
};
