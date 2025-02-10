/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * When the owner value is true or omitted, the accountId path parameter will specify the ID of the owner, and the API will retrieve the allowances that the owner has granted to different spenders. Conversely, when the owner value is false, the accountId path parameter will indicate the ID of the spender who has an allowance, and the API will instead provide the allowances granted to the spender by different owners of those tokens.
 */
export type ownerQueryParam = boolean;
