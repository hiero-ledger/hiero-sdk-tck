/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Contract } from "./Contract";
export type ContractResponse = Contract & {
  /**
   * The contract bytecode in hex during deployment
   */
  bytecode?: Blob | null;
  /**
   * The contract bytecode in hex after deployment
   */
  runtime_bytecode?: Blob | null;
};
