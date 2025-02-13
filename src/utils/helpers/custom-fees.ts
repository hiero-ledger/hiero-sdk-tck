import { expect } from "chai";
import {
  CustomFee,
  CustomFixedFee,
  CustomFractionalFee,
  CustomRoyaltyFee,
} from "@hashgraph/sdk";

import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

const stringifyNumberValue = (value: any) => {
  if (value === null || value === undefined) {
    return "0";
  }

  return value.toString();
};

const consensusNodeFeeEqualsCustomFee = (
  customFee: CustomFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
) => {
  return (
    feeCollectorAccountId ===
      stringifyNumberValue(customFee.feeCollectorAccountId) &&
    feeCollectorsExempt === customFee.allCollectorsAreExempt
  );
};

const consensusNodeFeeEqualsCustomFixedFee = (
  customFixedFee: CustomFixedFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  amount: string,
) => {
  return (
    consensusNodeFeeEqualsCustomFee(
      customFixedFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    ) && amount === stringifyNumberValue(customFixedFee.amount)
  );
};

const consensusNodeFeeEqualsCustomFractionalFee = (
  customFractionalFee: CustomFractionalFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  minAmount: string,
  maxAmount: string,
  assessmentMethod: string,
) => {
  return (
    consensusNodeFeeEqualsCustomFee(
      customFractionalFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    ) &&
    numerator === stringifyNumberValue(customFractionalFee.numerator) &&
    denominator === stringifyNumberValue(customFractionalFee.denominator) &&
    minAmount === stringifyNumberValue(customFractionalFee.min) &&
    maxAmount === stringifyNumberValue(customFractionalFee.max) &&
    (assessmentMethod === "exclusive") ===
      customFractionalFee.assessmentMethod?._value
  );
};

const consensusNodeFeeEqualsCustomRoyaltyFee = (
  customRoyaltyFee: CustomRoyaltyFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  fixedFeeAmount: string,
) => {
  return (
    consensusNodeFeeEqualsCustomFee(
      customRoyaltyFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    ) &&
    numerator === stringifyNumberValue(customRoyaltyFee.numerator) &&
    denominator === stringifyNumberValue(customRoyaltyFee.denominator) &&
    fixedFeeAmount ===
      stringifyNumberValue(customRoyaltyFee.fallbackFee?.amount)
  );
};

const mirrorNodeFeeEqualsCustomFixedFee = (
  // TODO: Get mirror node interface with OpenAPI
  customFixedFee: any,
  feeCollectorAccountId: string,
  amount: string,
) => {
  return (
    feeCollectorAccountId.toString() ===
      stringifyNumberValue(customFixedFee.collector_account_id) &&
    amount === stringifyNumberValue(customFixedFee.amount)
  );
};

const mirrorNodeFeeEqualsCustomFractionalFee = (
  // TODO: Get mirror node interface with OpenAPI
  customFractionalFee: any,
  feeCollectorAccountId: string,
  numerator: string,
  denominator: string,
  minAmount: string,
  maxAmount: string,
  assessmentMethod: string,
) => {
  if (customFractionalFee.maximum === null) {
    customFractionalFee.maximum = 0;
  }

  return (
    feeCollectorAccountId?.toString() ===
      stringifyNumberValue(customFractionalFee.collector_account_id) &&
    numerator === stringifyNumberValue(customFractionalFee.amount.numerator) &&
    denominator ===
      stringifyNumberValue(customFractionalFee.amount.denominator) &&
    minAmount === stringifyNumberValue(customFractionalFee.minimum) &&
    maxAmount === stringifyNumberValue(customFractionalFee.maximum) &&
    (assessmentMethod === "exclusive") === customFractionalFee.net_of_transfers
  );
};

const mirrorNodeFeeEqualsCustomRoyaltyFee = (
  // TODO: Get mirror node interface with OpenAPI
  customRoyaltyFee: any,
  feeCollectorAccountId: string,
  numerator: string,
  denominator: string,
  fixedFeeAmount: string,
) => {
  return (
    feeCollectorAccountId.toString() ===
      stringifyNumberValue(customRoyaltyFee.collector_account_id) &&
    numerator === stringifyNumberValue(customRoyaltyFee.amount.numerator) &&
    denominator === stringifyNumberValue(customRoyaltyFee.amount.denominator) &&
    fixedFeeAmount ===
      stringifyNumberValue(customRoyaltyFee.fallback_fee.amount)
  );
};

export const verifyTokenCreationWithFixedFee = async (
  tokenId: string,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  amount: string,
) => {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomFixedFee &&
      consensusNodeFeeEqualsCustomFixedFee(
        consensusNodeInfo.customFees[i] as CustomFixedFee,
        feeCollectorAccountId,
        feeCollectorsExempt,
        amount,
      )
    ) {
      foundConsensusNodeFee = true;
      break;
    }
  }

  for (let i = 0; i < mirrorNodeInfo?.custom_fees?.fixed_fees?.length!; i++) {
    if (
      mirrorNodeFeeEqualsCustomFixedFee(
        mirrorNodeInfo?.custom_fees?.fixed_fees![i],
        feeCollectorAccountId,
        amount,
      )
    ) {
      foundMirrorNodeFee = true;
      break;
    }
  }

  expect(foundConsensusNodeFee).to.be.true;
  expect(foundMirrorNodeFee).to.be.true;
};

export const verifyTokenCreationWithFractionalFee = async (
  tokenId: string,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  minAmount: string,
  maxAmount: string,
  assessmentMethod: string,
) => {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomFractionalFee &&
      consensusNodeFeeEqualsCustomFractionalFee(
        consensusNodeInfo.customFees[i] as CustomFractionalFee,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minAmount,
        maxAmount,
        assessmentMethod,
      )
    ) {
      foundConsensusNodeFee = true;
      break;
    }
  }

  for (
    let i = 0;
    i < mirrorNodeInfo?.custom_fees?.fractional_fees?.length!;
    i++
  ) {
    if (
      mirrorNodeFeeEqualsCustomFractionalFee(
        mirrorNodeInfo?.custom_fees?.fractional_fees![i],
        feeCollectorAccountId,
        numerator,
        denominator,
        minAmount,
        maxAmount,
        assessmentMethod,
      )
    ) {
      foundMirrorNodeFee = true;
      break;
    }
  }

  expect(foundConsensusNodeFee).to.be.true;
  expect(foundMirrorNodeFee).to.be.true;
};

export const verifyTokenCreationWithRoyaltyFee = async (
  tokenId: string,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  fixedFeeAmount: string,
) => {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomRoyaltyFee &&
      consensusNodeFeeEqualsCustomRoyaltyFee(
        consensusNodeInfo.customFees[i] as CustomRoyaltyFee,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        fixedFeeAmount,
      )
    ) {
      foundConsensusNodeFee = true;
      break;
    }
  }

  for (let i = 0; i < mirrorNodeInfo?.custom_fees?.royalty_fees?.length!; i++) {
    if (
      mirrorNodeFeeEqualsCustomRoyaltyFee(
        mirrorNodeInfo?.custom_fees?.royalty_fees![i],
        feeCollectorAccountId,
        numerator,
        denominator,
        fixedFeeAmount,
      )
    ) {
      foundMirrorNodeFee = true;
      break;
    }
  }

  expect(foundConsensusNodeFee).to.be.true;
  expect(foundMirrorNodeFee).to.be.true;
};
