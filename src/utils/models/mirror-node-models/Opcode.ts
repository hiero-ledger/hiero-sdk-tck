/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Represents a struct/opcode log entry in a trace
 */
export type Opcode = {
  /**
   * The current call depth
   */
  depth: number;
  /**
   * The remaining gas
   */
  gas: number;
  /**
   * The cost for executing op
   */
  gas_cost: number;
  /**
   * The EVM memory with items in hex
   */
  memory: Array<Blob> | null;
  /**
   * The opcode to execute
   */
  op: string;
  /**
   * The program counter
   */
  pc: number;
  /**
   * The revert reason in hex
   */
  reason?: Blob | null;
  /**
   * The EVM stack with items in hex
   */
  stack: Array<Blob> | null;
  /**
   * The storage slots (keys and values in hex) of the current contract which is read from and written to
   */
  storage: Record<string, Blob> | null;
};
