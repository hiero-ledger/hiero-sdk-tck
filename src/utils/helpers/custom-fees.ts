import { expect } from "chai";
import {
  CustomFee,
  CustomFixedFee,
  CustomFractionalFee,
  CustomRoyaltyFee,
} from "@hashgraph/sdk";

import mirrorNodeClient from "../../services/MirrorNodeClient";
import consensusInfoClient from "../../services/ConsensusInfoClient";

async function consensusNodeFeeEqualsCustomFee(
  customFee: CustomFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
) {
  return (
    feeCollectorAccountId === customFee.feeCollectorAccountId?.toString() &&
    feeCollectorsExempt === customFee.allCollectorsAreExempt
  );
}

async function consensusNodeFeeEqualsCustomFixedFee(
  customFixedFee: CustomFixedFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  amount: string,
) {
  return (
    (await consensusNodeFeeEqualsCustomFee(
      customFixedFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    )) && amount === customFixedFee.amount?.toString()
  );
}

async function consensusNodeFeeEqualsCustomFractionalFee(
  customFractionalFee: CustomFractionalFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  minAmount: string,
  maxAmount: string,
  assessmentMethod: string,
) {
  return (
    (await consensusNodeFeeEqualsCustomFee(
      customFractionalFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    )) &&
    numerator === customFractionalFee.numerator?.toString() &&
    denominator === customFractionalFee.denominator?.toString() &&
    minAmount === customFractionalFee.min?.toString() &&
    maxAmount === customFractionalFee.max?.toString() &&
    assessmentMethod ===
      customFractionalFee.assessmentMethod?.toString().toLowerCase()
  );
}

async function consensusNodeFeeEqualsCustomRoyaltyFee(
  customRoyaltyFee: CustomRoyaltyFee,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  fixedFeeAmount: string,
) {
  return (
    (await consensusNodeFeeEqualsCustomFee(
      customRoyaltyFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    )) &&
    numerator === customRoyaltyFee.numerator?.toString() &&
    denominator === customRoyaltyFee.denominator?.toString() &&
    fixedFeeAmount === customRoyaltyFee.fallbackFee?.amount?.toString()
  );
}

async function mirrorNodeFeeEqualsCustomFixedFee(
  customFixedFee: CustomFixedFee,
  feeCollectorAccountId: string,
  amount: string,
) {
  return (
    feeCollectorAccountId.toString() ===
      customFixedFee.feeCollectorAccountId?.toString() &&
    amount === customFixedFee.amount?.toString()
  );
}

async function mirrorNodeFeeEqualsCustomFractionalFee(
  customFractionalFee: CustomFractionalFee,
  feeCollectorAccountId: string,
  numerator: string,
  denominator: string,
  minAmount: string,
  maxAmount: string,
  assessmentMethod: string,
) {
  return (
    feeCollectorAccountId?.toString() ===
      customFractionalFee.feeCollectorAccountId?.toString() &&
    numerator === customFractionalFee.numerator?.toString() &&
    denominator === customFractionalFee.denominator?.toString() &&
    minAmount === customFractionalFee?.toString() &&
    maxAmount === customFractionalFee?.toString() &&
    (assessmentMethod === "exclusive") ===
      customFractionalFee._allCollectorsAreExempt
  );
}

async function mirrorNodeFeeEqualsCustomRoyaltyFee(
  customRoyaltyFee: CustomRoyaltyFee,
  feeCollectorAccountId: string,
  numerator: string,
  denominator: string,
  fixedFeeAmount: string,
) {
  return (
    feeCollectorAccountId.toString() ===
      customRoyaltyFee.feeCollectorAccountId?.toString() &&
    numerator === customRoyaltyFee.numerator?.toString() &&
    denominator === customRoyaltyFee.denominator?.toString() &&
    fixedFeeAmount === customRoyaltyFee.fallbackFee?.amount?.toString()
  );
}

export async function verifyTokenCreationWithFixedFee(
  tokenId: string,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  amount: string,
) {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomFixedFee &&
      (await consensusNodeFeeEqualsCustomFixedFee(
        consensusNodeInfo.customFees[i],
        feeCollectorAccountId,
        feeCollectorsExempt,
        amount,
      ))
    ) {
      foundConsensusNodeFee = true;
      break;
    }
  }

  for (let i = 0; i < mirrorNodeInfo.custom_fees.fixed_fees.length; i++) {
    if (
      await mirrorNodeFeeEqualsCustomFixedFee(
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
}

export async function verifyTokenCreationWithFractionalFee(
  tokenId: string,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  minAmount: string,
  maxAmount: string,
  assessmentMethod: string,
) {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomFractionalFee &&
      (await consensusNodeFeeEqualsCustomFractionalFee(
        consensusNodeInfo.customFees[i],
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minAmount,
        maxAmount,
        assessmentMethod,
      ))
    ) {
      foundConsensusNodeFee = true;
      break;
    }
  }

  for (let i = 0; i < mirrorNodeInfo.custom_fees.fractional_fees.length; i++) {
    if (
      await mirrorNodeFeeEqualsCustomFractionalFee(
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
}

export async function verifyTokenCreationWithRoyaltyFee(
  tokenId: string,
  feeCollectorAccountId: string,
  feeCollectorsExempt: boolean,
  numerator: string,
  denominator: string,
  fixedFeeAmount: string,
) {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomRoyaltyFee &&
      (await consensusNodeFeeEqualsCustomRoyaltyFee(
        consensusNodeInfo.customFees[i],
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        fixedFeeAmount,
      ))
    ) {
      foundConsensusNodeFee = true;
      break;
    }
  }

  for (let i = 0; i < mirrorNodeInfo.custom_fees.royalty_fees.length; i++) {
    if (
      await mirrorNodeFeeEqualsCustomRoyaltyFee(
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
}
