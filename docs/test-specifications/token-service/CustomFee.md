# Custom Fee

Custom fees can be added to tokens that will be charged users automatically when being transferred based on a variety of parameters. These fees can be specified when a token is created (`TokenCreateTransaction`) or added/updated at a later time (`TokenFeeScheduleUpdateTransaction`).

## Custom Fee Object Definition

| Parameter Name        | Type        | Required/Optional | Description/Notes                                                                                                                              |
|-----------------------|-------------|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| feeCollectorAccountId | string      | required          | The ID of the account to which all fees will be sent when assessed.                                                                            |
| feeCollectorsExempt   | bool        | required          | Should all fee collector accounts of any fee for this token be exempt from being charged fees when transferring this token?                    |
| fixedFee              | json object | optional          | REQUIRED if `fractionalFee` and `royaltyFee` are not provided. The parameters of the [Fixed Fee](#fixed-fee-object-definition) to assess.      |
| fractionalFee         | json object | optional          | REQUIRED if `fixedFee` and `royaltyFee` are not provided. The parameters of the [Fractional Fee](#fractional-fee-object-definition) to assess. |
| royaltyFee            | json object | optional          | REQUIRED if `fixedFee` and `fractionalFee` are not provided. The parameters of the [Royalty Fee](#royalty-fee-object-definition) to assess.    |

### Fixed Fee Object Definition

| Parameter Name      | Type   | Required/Optional | Description/Notes                                                                                                                                                                                   |
|---------------------|--------|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| amount              | string  | required          | The amount to be assessed as a fee.                                                                                                                                                                 |
| denominatingTokenId | string | optional          | The ID of the token to use to assess the fee. The value "0.0.0" SHALL be used to specify the token being created if used in a `TokenCreateTransaction`. Hbar SHALL be used if no value is provided. |

### Fractional Fee Object Definition

| Parameter Name   | Type   | Required/Optional | Description/Notes                                                                                                                                                                                                                                                                          |
|------------------|--------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| numerator        | string  | required          | The numerator of the fraction of the amount to be assessed as a fee.                                                                                                                                                                                                                       |
| denominator      | string  | required          | The denominator of the fraction of the amount to be assessed as a fee.                                                                                                                                                                                                                     |
| minimumAmount    | string  | required          | The minimum amount to assess as a fee.                                                                                                                                                                                                                                                     |
| maximumAmount    | string  | required          | The maximum amount to assess as a fee. 0 implies no maximum.                                                                                                                                                                                                                               |
| assessmentMethod | string | required          | How should the fee be assessed? It MUST be one of `inclusive` or `exclusive`. `inclusive` means the fee is included in the amount of tokens transferred and will be subtracted from that amount, while `exclusive` means the sender will be charged in addition to the transferred amount. |

### Royalty Fee Object Definition

| Parameter Name | Type        | Required/Optional | Description/Notes                                                                                          |
|----------------|-------------|-------------------|------------------------------------------------------------------------------------------------------------|
| numerator      | string       | required          | The numerator of the fraction of the amount to be assessed as a fee.                                       |
| denominator    | string       | required          | The denominator of the fraction of the amount to be assessed as a fee.                                     |
| fallbackFee    | json object | optional          | The [Fixed Fee](#fixed-fee-object-definition) to assess to the receiver if no fungible value is exchanged. |

## Example Usage

If the `createToken` method were to contain a custom fee of each type, its usage would look like:

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createToken",
  "params": {
    "name": "name",
    "symbol": "symbol",
    "treasureAccountId": "0.0.547295",
    "tokenType": "ft",
    "customFees": [
      {
        "feeCollectorAccountId": "0.0.9931",
        "feeCollectorsExempt": true,
        "fixedFee": {
          "amount": "10",
          "denominatingTokenId": "0.0.8228"
        }
      },
      {
        "feeCollectorAccountId": "0.0.3467294",
        "feeCollectorsExempt": false,
        "fractionalFee": {
          "numerator": "12",
          "denominator": "29",
          "minimumAmount": "50",
          "maximumAmount": "5000",
          "assessmentMethod": "inclusive"
        }
      },
      {
        "feeCollectorAccountId": "0.0.437195",
        "feeCollectorsExempt": true,
        "royaltyFee": {
          "numerator": "1",
          "denominator": "94",
          "fallbackFee": {
            "amount": "25",
            "denominatingTokenId": "0.0.67932"
          }
        }
      }
    ]
  }
}
```

**NOTE**: This example here is to demonstrate only how the fees would look in a JSON-RPC request. This request would not actually execute on the network as a royalty fee cannot be added to a fungible token.
