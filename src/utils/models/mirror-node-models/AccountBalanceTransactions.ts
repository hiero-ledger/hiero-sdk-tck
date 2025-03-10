/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountInfo } from "./AccountInfo";
import type { Links } from "./Links";
import type { Transactions } from "./Transactions";
export type AccountBalanceTransactions = AccountInfo & {
  transactions: Transactions;
  links: Links;
};
