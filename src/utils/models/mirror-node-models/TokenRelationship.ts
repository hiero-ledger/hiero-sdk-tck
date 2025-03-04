/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityId } from "./EntityId";
import type { Timestamp } from "./Timestamp";
export type TokenRelationship = {
  /**
   * Specifies if the relationship is implicitly/explicitly associated.
   */
  automatic_association: boolean;
  /**
   * For FUNGIBLE_COMMON, the balance that the account holds in the smallest denomination. For NON_FUNGIBLE_UNIQUE, the number of NFTs held by the account.
   */
  balance: number;
  created_timestamp: Timestamp;
  decimals: number;
  /**
   * The Freeze status of the account.
   */
  freeze_status: TokenRelationship.freeze_status;
  /**
   * The KYC status of the account.
   */
  kyc_status: TokenRelationship.kyc_status;
  token_id: EntityId;
};
export namespace TokenRelationship {
  /**
   * The Freeze status of the account.
   */
  export enum freeze_status {
    NOT_APPLICABLE = "NOT_APPLICABLE",
    FROZEN = "FROZEN",
    UNFROZEN = "UNFROZEN",
  }
  /**
   * The KYC status of the account.
   */
  export enum kyc_status {
    NOT_APPLICABLE = "NOT_APPLICABLE",
    GRANTED = "GRANTED",
    REVOKED = "REVOKED",
  }
}
