/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Bloom } from "./Bloom";
import type { ContractLogTopics } from "./ContractLogTopics";
import type { EntityId } from "./EntityId";
export type ContractResultLog = {
  /**
   * The hex encoded EVM address of the contract
   */
  address?: string;
  bloom?: Bloom;
  contract_id?: EntityId;
  /**
   * The hex encoded data of the contract log
   */
  data?: string | null;
  /**
   * The index of the contract log in the chain of logs for an execution
   */
  index?: number;
  topics?: ContractLogTopics;
};
