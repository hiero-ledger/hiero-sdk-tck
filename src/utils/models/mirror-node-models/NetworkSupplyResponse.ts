/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Timestamp } from "./Timestamp";
export type NetworkSupplyResponse = {
  /**
   * The network's released supply of hbars in tinybars
   */
  released_supply?: string;
  timestamp?: Timestamp;
  /**
   * The network's total supply of hbars in tinybars
   */
  total_supply?: string;
};
