/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The public key which controls access to various network entities.
 */
export type Key = {
    _type?: Key._type;
    key?: string;
};
export namespace Key {
    export enum _type {
        ECDSA_SECP256K1 = 'ECDSA_SECP256K1',
        ED25519 = 'ED25519',
        PROTOBUF_ENCODED = 'ProtobufEncoded',
    }
}

