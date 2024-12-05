import { expect } from "chai";
import {
  CustomFee,
  CustomFixedFee,
  CustomFractionalFee,
  CustomRoyaltyFee,
} from "@hashgraph/sdk";

import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

const consensusNodeFeeEqualsCustomFee = (
  customFee: CustomFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
) => {
  return (
    feeCollectorAccountId === customFee.feeCollectorAccountId?.toString() &&
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
    ) && amount === customFixedFee.amount?.toString()
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
    numerator === customFractionalFee.numerator?.toString() &&
    denominator === customFractionalFee.denominator?.toString() &&
    minAmount === customFractionalFee.min?.toString() &&
    maxAmount === customFractionalFee.max?.toString() &&
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
    numerator === customRoyaltyFee.numerator?.toString() &&
    denominator === customRoyaltyFee.denominator?.toString() &&
    fixedFeeAmount === customRoyaltyFee.fallbackFee?.amount?.toString()
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
      customFixedFee.collector_account_id.toString() &&
    amount === customFixedFee.amount?.toString()
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
  return (
    feeCollectorAccountId?.toString() ===
      customFractionalFee.collector_account_id &&
    numerator === customFractionalFee.amount.numerator.toString() &&
    denominator === customFractionalFee.amount.denominator.toString() &&
    minAmount === customFractionalFee.minimum.toString() &&
    maxAmount === customFractionalFee.maximum.toString() &&
    (assessmentMethod === "exclusive") ===
      customFractionalFee._allCollectorsAreExempt
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
      customRoyaltyFee.collector_account_id &&
    numerator === customRoyaltyFee.amount.numerator?.toString() &&
    denominator === customRoyaltyFee.amount.denominator?.toString() &&
    fixedFeeAmount === customRoyaltyFee.fallback_fee.amount?.toString()
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

  for (let i = 0; i < mirrorNodeInfo.custom_fees.fixed_fees.length; i++) {
    if (
      mirrorNodeFeeEqualsCustomFixedFee(
        mirrorNodeInfo.custom_fees.fixed_fees[i],
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

  for (let i = 0; i < mirrorNodeInfo.custom_fees.fractional_fees.length; i++) {
    if (
      mirrorNodeFeeEqualsCustomFractionalFee(
        mirrorNodeInfo.custom_fees.fractional_fees[i],
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

  for (let i = 0; i < mirrorNodeInfo.custom_fees.royalty_fees.length; i++) {
    if (
      mirrorNodeFeeEqualsCustomRoyaltyFee(
        mirrorNodeInfo.custom_fees.royalty_fees[i],
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
