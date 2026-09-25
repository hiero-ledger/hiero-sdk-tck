import { toHexString } from "./verify-contract-tx";

/**
 * JSON-RPC result of `contractCallQuery`.
 *
 * The TCK spec names the payload `bytes`. Some SDK TCK servers (JS, Java,
 * C++) still send `rawResult`.
 */
export type ContractCallQueryResult = {
  bytes?: unknown;
  rawResult?: unknown;
};

/**
 * Spec field `bytes`, falling back to `rawResult` for older TCK servers.
 */
export const getContractCallResultPayload = (
  response: ContractCallQueryResult,
): unknown => {
  return response.bytes ?? response.rawResult;
};

const payloadToAbiHex = (payload: unknown): string => {
  if (payload === null || payload === undefined) {
    throw new Error(
      "contractCallQuery response is missing bytes (and rawResult fallback)",
    );
  }

  if (typeof payload === "string") {
    const hex = payload.trim();
    if (hex.length === 0) {
      throw new Error("contractCallQuery result hex is empty");
    }
    return /^0x/i.test(hex) ? `0x${hex.slice(2)}` : `0x${hex}`;
  }

  if (payload instanceof Uint8Array) {
    return `0x${toHexString(payload)}`;
  }

  throw new Error(
    `contractCallQuery result has unsupported type: ${typeof payload}`,
  );
};

/**
 * Hex string with a single `0x` prefix, suitable for ethers AbiCoder.decode.
 */
export const getContractCallResultHex = (
  response: ContractCallQueryResult,
): string => {
  return payloadToAbiHex(getContractCallResultPayload(response));
};
