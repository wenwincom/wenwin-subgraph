import { BigInt } from '@graphprotocol/graph-ts';
import { Lottery } from '../../generated/Lottery/Lottery';

const PERCENTAGE_BASE = BigInt.fromI32(100);
const EXCESS_BONUS_ALLOCATION = BigInt.fromI32(50);
const SAFETY_MARGIN = BigInt.fromI32(33);

export function calculateJackpot(lottery: Lottery): BigInt {
  return calculateReward(lottery.currentNetProfit(), lottery.fixedReward(lottery.selectionSize()));
}

function calculateReward(netProfit: BigInt, fixedJackpot: BigInt): BigInt {
  const excess = calculateExcessPot(netProfit, fixedJackpot);
  const scaledExcess = excess.times(EXCESS_BONUS_ALLOCATION).div(PERCENTAGE_BASE);
  return fixedJackpot.plus(scaledExcess);
}

function calculateExcessPot(netProfit: BigInt, fixedJackpot: BigInt): BigInt {
  const excessPotSafePercentage = PERCENTAGE_BASE.minus(SAFETY_MARGIN);
  const safeNetProfit = netProfit.times(excessPotSafePercentage).div(PERCENTAGE_BASE);
  const excessPot = safeNetProfit.minus(fixedJackpot);
  return excessPot.gt(BigInt.fromI32(0)) ? excessPot : BigInt.fromI32(0);
}
