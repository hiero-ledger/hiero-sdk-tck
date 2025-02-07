/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Timestamp } from './Timestamp';
export type ScheduleSignature = {
    consensus_timestamp?: Timestamp;
    public_key_prefix?: string;
    signature?: string;
    type?: ScheduleSignature.type;
};
export namespace ScheduleSignature {
    export enum type {
        CONTRACT = 'CONTRACT',
        ED25519 = 'ED25519',
        RSA_3072 = 'RSA_3072',
        ECDSA_384 = 'ECDSA_384',
        ECDSA_SECP256K1 = 'ECDSA_SECP256K1',
        UNKNOWN = 'UNKNOWN',
    }
}

