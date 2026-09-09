import { expect } from "chai";
import { AbiCoder } from "ethers";
import {
  getContractCallResultHex,
  getContractCallResultPayload,
} from "@helpers/contract-call-result";

const abiCoder = AbiCoder.defaultAbiCoder();

function decodeFromCallQuery(
  response: { rawResult?: unknown; bytes?: unknown },
  types: string[],
) {
  const payload = getContractCallResultPayload(response);
  expect(payload).to.not.be.null;
  return abiCoder.decode(types, getContractCallResultHex(response))[0];
}

describe("ContractCallQuery result bytes (#703)", function () {
  const encoded300 = abiCoder.encode(["uint256"], [300n]) as string;

  it("decodes uint256 from spec-compliant bytes (already 0x-prefixed)", function () {
    const response = { bytes: encoded300 };
    const result = decodeFromCallQuery(response, ["uint256"]);
    expect(result.toString()).to.equal("300");
  });

  it("does not double-prefix when the payload is already 0x-prefixed", function () {
    expect(getContractCallResultHex({ bytes: encoded300 })).to.equal(
      encoded300,
    );
    const result = abiCoder.decode(
      ["uint256"],
      getContractCallResultHex({ bytes: encoded300 }),
    )[0];
    expect(result.toString()).to.equal("300");
  });

  it("still decodes unprefixed rawResult from JS/Java/C++ TCK servers", function () {
    const response = { rawResult: encoded300.slice(2) };
    const result = decodeFromCallQuery(response, ["uint256"]);
    expect(result.toString()).to.equal("300");
  });

  it("prefers bytes when both fields are present", function () {
    const response = { bytes: encoded300, rawResult: "deadbeef" };
    expect(getContractCallResultPayload(response)).to.equal(encoded300);
    expect(
      abiCoder
        .decode(["uint256"], getContractCallResultHex(response))[0]
        .toString(),
    ).to.equal("300");
  });

  it("hex-encodes Uint8Array payloads", function () {
    const bytes = Uint8Array.from(Buffer.from(encoded300.slice(2), "hex"));
    expect(getContractCallResultHex({ bytes }).toLowerCase()).to.equal(
      encoded300,
    );
  });
});
