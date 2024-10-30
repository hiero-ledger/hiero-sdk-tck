/**
 * Class representing an ASN.1 decoder.
 */
class ASN1Decoder {
  /**
   * Creates an ASN.1 decoder instance.
   * @param {ArrayBuffer | Uint8Array} data - The ASN.1 encoded data to decode.
   */
  constructor(data) {
    /**
     * The data to be decoded.
     * @type {Uint8Array}
     */
    this.data = new Uint8Array(data);

    /**
     * The current position in the data.
     * @type {number}
     */
    this.pos = 0;

    /**
     * The list of decoded Object Identifiers (OIDs).
     * @type {string[]}
     */
    this.oids = [];

    /**
     * A map of known OID values to their string representations.
     * @type {Object.<string, string>}
     */
    this.oidMap = {
      "1.3.132.0.10": "ecdsa",
      "1.3.101.112": "ed25519",
      "1.2.840.10045.2.1": "pubkey",
    };
  }

  /**
   * Reads the length of the current ASN.1 data element.
   * @returns {number} The length of the data element.
   */
  readLength() {
    let length = this.data[this.pos++];
    if (length & 0x80) {
      let numBytes = length & 0x7f;
      length = 0;
      for (let i = 0; i < numBytes; i++) {
        length = (length << 8) | this.data[this.pos++];
      }
    }
    return length;
  }

  /**
   * Reads the type of the current ASN.1 data element.
   * @returns {number} The type of the data element.
   */
  readType() {
    return this.data[this.pos++];
  }

  /**
   * Reads an INTEGER ASN.1 data element.
   * @returns {Object} An object containing the decoded integer.
   */
  readInteger() {
    let length = this.readLength();
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = (value << 8) | this.data[this.pos++];
    }
    return { integer: value };
  }

  /**
   * Reads an OCTET STRING ASN.1 data element.
   * @returns {Object} An object containing the decoded private key.
   */
  readOctetString() {
    let length = this.readLength();
    let value = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return { pkey: value };
  }

  /**
   * Reads a BIT STRING ASN.1 data element.
   * @returns {Object} An object containing the number of unused bits
   */
  readBitString() {
    let length = this.readLength();
    let unusedBits = this.data[this.pos++];
    let value = this.data.slice(this.pos, this.pos + length - 1);
    this.pos += length - 1;
    return { unusedBits, pubkey: value };
  }

  /**
   * Reads an OBJECT IDENTIFIER (OID) ASN.1 data element.
   * @returns {Object} An object containing the decoded OID as a string.
   */
  readObjectIdentifier() {
    let length = this.readLength();
    let endPos = this.pos + length;
    let oid = [];
    let value = 0;

    let firstByte = this.data[this.pos++];
    oid.push(Math.floor(firstByte / 40));
    oid.push(firstByte % 40);

    while (this.pos < endPos) {
      let byte = this.data[this.pos++];
      value = (value << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) {
        oid.push(value);
        value = 0;
      }
    }

    let oidStr = oid.join(".");
    this.oids.push(oidStr);
    return { oid: oidStr };
  }

  /**
   * Returns the list of decoded OIDs.
   * @returns {string[]} The list of decoded OIDs.
   */
  getOids() {
    return this.oids;
  }

  /**
   * Returns the list of key types associated with the decoded OIDs.
   * @returns {string[]} The list of key types.
   */
  getOidKeyTypes() {
    return this.oids.map((oid) => this.oidMap[oid] || "unknown");
  }

  /**
   * Reads a SEQUENCE ASN.1 data element.
   * @returns {Array<string>} An array of decoded items.
   */
  readSequence() {
    let length = this.readLength();
    let endPos = this.pos + length;
    let items = [];
    while (this.pos < endPos) {
      items.push(this.read());
    }
    return items;
  }

  /**
   * Decodes the next ASN.1 data element based on its type.
   * @returns {*} The decoded data element.
   * @throws {Error} Throws an error if the type is unsupported.
   */
  read() {
    let type = this.readType();
    switch (type) {
      case 0x02:
        return this.readInteger();
      case 0x03:
        return this.readBitString();
      case 0x04:
        return this.readOctetString();
      case 0x06:
        return this.readObjectIdentifier();
      case 0x30:
      case 0xa0:
      case 0xa1:
        return this.readSequence();
      default:
        throw new Error("Unsupported type: " + type);
    }
  }

  /**
   * Extracts the raw key (public or private) from the parsed ASN.1 structure.
   * @returns {string} The raw key as a hexadecimal string.
   * @throws {Error} If no key is found in the provided data.
   */
  getRawKey() {
    const sequence = this.read();

    for (let item of sequence) {
      if (item.pubkey) {
        return Buffer.from(item.pubkey).toString("hex");
      }
      if (item.pkey) {
        return Buffer.from(item.pkey).toString("hex");
      }
    }

    throw new Error("No key found in the provided data.");
  }
}

/**
 * Converts a hexadecimal DER-encoded key to its raw format using ASN1Decoder.
 * @param {string} hex - The DER-encoded key as a hexadecimal string.
 * @returns {string} The raw key in hexadecimal format.
 */
export const getRawKeyFromHex = (hex) => {
  const data1 = Uint8Array.from(Buffer.from(hex, "hex"));
  const decoder = new ASN1Decoder(data1);

  return decoder.getRawKey();
};
