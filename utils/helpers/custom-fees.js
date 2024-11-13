import { expect } from "chai";
import {
  CustomFixedFee,
  CustomFractionalFee,
  CustomRoyaltyFee,
} from "@hashgraph/sdk";

import mirrorNodeClient from "../../mirrorNodeClient.js";
import consensusInfoClient from "../../consensusInfoClient.js";

async function consensusNodeFeeEqualsCustomFee(
  customFee,
  feeCollectorAccountId,
  feeCollectorsExempt,
) {
  return (
    feeCollectorAccountId === customFee.feeCollectorAccountId.toString() &&
    feeCollectorsExempt === customFee.allCollectorsAreExempt
  );
}

async function consensusNodeFeeEqualsCustomFixedFee(
  customFixedFee,
  feeCollectorAccountId,
  feeCollectorsExempt,
  amount,
) {
  return (
    consensusNodeFeeEqualsCustomFee(
      customFixedFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    ) && amount === customFixedFee.amount
  );
}

async function consensusNodeFeeEqualsCustomFractionalFee(
  customFractionalFee,
  feeCollectorAccountId,
  feeCollectorsExempt,
  numerator,
  denominator,
  minAmount,
  maxAmount,
  assessmentMethod,
) {
  return (
    consensusNodeFeeEqualsCustomFee(
      customFractionalFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    ) &&
    numerator === customFractionalFee.numerator &&
    denominator === customFractionalFee.denominator &&
    minAmount === customFractionalFee.minimumAmount &&
    maxAmount === customFractionalFee.maximumAmount &&
    assessmentMethod ===
      customFractionalFee.assessmentMethod.toString().toLowerCase()
  );
}

async function consensusNodeFeeEqualsCustomRoyaltyFee(
  customRoyaltyFee,
  feeCollectorAccountId,
  feeCollectorsExempt,
  numerator,
  denominator,
  fixedFeeAmount,
) {
  return (
    consensusNodeFeeEqualsCustomFee(
      customRoyaltyFee,
      feeCollectorAccountId,
      feeCollectorsExempt,
    ) &&
    numerator === customRoyaltyFee.numerator &&
    denominator === customRoyaltyFee.denominator &&
    fixedFeeAmount === customRoyaltyFee.fixedFeeAmount
  );
}

async function mirrorNodeFeeEqualsCustomFixedFee(
  customFixedFee,
  feeCollectorAccountId,
  amount,
) {
  return (
    feeCollectorAccountId === customFixedFee.collector_account_id &&
    amount === customFixedFee.amount
  );
}

async function mirrorNodeFeeEqualsCustomFractionalFee(
  customFractionalFee,
  feeCollectorAccountId,
  numerator,
  denominator,
  minAmount,
  maxAmount,
  assessmentMethod,
) {
  return (
    feeCollectorAccountId === customFractionalFee.collector_account_id &&
    numerator === customFractionalFee.amount.numerator &&
    denominator === customFractionalFee.amount.denominator &&
    minAmount === customFractionalFee.minimum &&
    maxAmount === customFractionalFee.maximum &&
    (assessmentMethod === "exclusive") === customFractionalFee.net_of_transfer
  );
}

async function mirrorNodeFeeEqualsCustomRoyaltyFee(
  customRoyaltyFee,
  feeCollectorAccountId,
  numerator,
  denominator,
  fixedFeeAmount,
) {
  return (
    feeCollectorAccountId === customRoyaltyFee.collector_account_id &&
    numerator === customRoyaltyFee.amount.numerator &&
    denominator === customRoyaltyFee.amount.denominator &&
    fixedFeeAmount === customRoyaltyFee.fallback_fee.amount
  );
}

export async function verifyTokenCreationWithFixedFee(
  tokenId,
  feeCollectorAccountId,
  feeCollectorsExempt,
  amount,
) {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomFixedFee &&
      consensusNodeFeeEqualsCustomFixedFee(
        consensusNodeInfo.customFees[i],
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
}

export async function verifyTokenCreationWithFractionalFee(
  tokenId,
  feeCollectorAccountId,
  feeCollectorsExempt,
  numerator,
  denominator,
  minAmount,
  maxAmount,
  assessmentMethod,
) {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomFractionalFee &&
      consensusNodeFeeEqualsCustomFractionalFee(
        consensusNodeInfo.customFees[i],
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
}

export async function verifyTokenCreationWithRoyaltyFee(
  tokenId,
  feeCollectorAccountId,
  feeCollectorsExempt,
  numerator,
  denominator,
  fixedFeeAmount,
) {
  const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

  let foundConsensusNodeFee = false;
  let foundMirrorNodeFee = false;

  for (let i = 0; i < consensusNodeInfo.customFees.length; i++) {
    if (
      consensusNodeInfo.customFees[i] instanceof CustomRoyaltyFee &&
      consensusNodeFeeEqualsCustomRoyaltyFee(
        consensusNodeInfo.customFees[i],
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
}
