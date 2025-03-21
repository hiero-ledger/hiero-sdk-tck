/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Filter the query result by the nonce of the transaction. A zero nonce represents user submitted transactions while a non-zero nonce is generated by main nodes. The filter honors the last value. If not specified, all transactions with specified payer account ID and valid start timestamp match. If multiple values are provided the last value will be the only value used.
 */
export type nonceQueryParam = number;
