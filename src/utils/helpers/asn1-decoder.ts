/**
 * Class representing an ASN.1 decoder.
 */
class ASN1Decoder {
  private data: Uint8Array;
  private pos: number = 0;
  private oids: string[] = [];
  private oidMap: Record<string, string> = {
    "1.3.132.0.10": "ecdsa",
    "1.3.101.112": "ed25519",
    "1.2.840.10045.2.1": "pubkey",
  };

  /**
   * Creates an ASN.1 decoder instance.
   * @param data - The ASN.1 encoded data to decode.
   */
  constructor(data: ArrayBuffer | Uint8Array) {
    this.data = new Uint8Array(data);
  }

  /**
   * Reads the length of the current ASN.1 data element.
   * @returns The length of the data element.
   */
  private readLength(): number {
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
   * @returns The type of the data element.
   */
  private readType(): number {
    return this.data[this.pos++];
  }

  /**
   * Reads an INTEGER ASN.1 data element.
   * @returns An object containing the decoded integer.
   */
  private readInteger(): { integer: number } {
    const length = this.readLength();
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = (value << 8) | this.data[this.pos++];
    }
    return { integer: value };
  }

  /**
   * Reads an OCTET STRING ASN.1 data element.
   * @returns An object containing the decoded private key.
   */
  private readOctetString(): { pkey: Uint8Array } {
    const length = this.readLength();
    const value = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return { pkey: value };
  }

  /**
   * Reads a BIT STRING ASN.1 data element.
   * @returns An object containing the number of unused bits.
   */
  private readBitString(): { unusedBits: number; pubkey: Uint8Array } {
    const length = this.readLength();
    const unusedBits = this.data[this.pos++];
    const value = this.data.slice(this.pos, this.pos + length - 1);
    this.pos += length - 1;
    return { unusedBits, pubkey: value };
  }

  /**
   * Reads an OBJECT IDENTIFIER (OID) ASN.1 data element.
   * @returns An object containing the decoded OID as a string.
   */
  private readObjectIdentifier(): { oid: string } {
    const length = this.readLength();
    const endPos = this.pos + length;
    const oid: number[] = [];
    let value = 0;

    const firstByte = this.data[this.pos++];
    oid.push(Math.floor(firstByte / 40));
    oid.push(firstByte % 40);

    while (this.pos < endPos) {
      const byte = this.data[this.pos++];
      value = (value << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) {
        oid.push(value);
        value = 0;
      }
    }

    const oidStr = oid.join(".");
    this.oids.push(oidStr);
    return { oid: oidStr };
  }

  /**
   * Returns the list of decoded OIDs.
   * @returns The list of decoded OIDs.
   */
  getOids(): string[] {
    return this.oids;
  }

  /**
   * Returns the list of key types associated with the decoded OIDs.
   * @returns The list of key types.
   */
  getOidKeyTypes(): string[] {
    return this.oids.map((oid) => this.oidMap[oid] || "unknown");
  }

  /**
   * Reads a SEQUENCE ASN.1 data element.
   * @returns An array of decoded items.
   */
  private readSequence(): any[] {
    const length = this.readLength();
    const endPos = this.pos + length;
    const items: any[] = [];
    while (this.pos < endPos) {
      items.push(this.read());
    }
    return items;
  }

  /**
   * Decodes the next ASN.1 data element based on its type.
   * @returns The decoded data element.
   * @throws If the type is unsupported.
   */
  private read(): any {
    const type = this.readType();
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
   * @returns The raw key as a hexadecimal string.
   * @throws If no key is found in the provided data.
   */
  getRawKey(): string {
    const sequence = this.read();

    for (const item of sequence) {
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
 * @param hex - The DER-encoded key as a hexadecimal string.
 * @returns The raw key in hexadecimal format.
 */
export const getRawKeyFromHex = (hex: string): string => {
  const data1 = Uint8Array.from(Buffer.from(hex, "hex"));
  const decoder = new ASN1Decoder(data1);

  return decoder.getRawKey();
};
