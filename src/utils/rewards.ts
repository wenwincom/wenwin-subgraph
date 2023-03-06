import { BigInt } from '@graphprotocol/graph-ts';
import { Lottery } from '../../generated/Lottery/Lottery';

const PERCENTAGE_BASE = BigInt.fromI32(100);
const EXCESS_BONUS_ALLOCATION = BigInt.fromI32(50);
const SAFETY_MARGIN = BigInt.fromI32(33);

export function calculateTierReward(lottery: Lottery, currentDraw: BigInt, winTier: i32, selectionSize: i32): BigInt {
  return calculateReward(
    lottery.currentNetProfit(),
    lottery.fixedReward(winTier),
    lottery.fixedReward(selectionSize),
    currentDraw.gt(BigInt.fromI32(0)) ? lottery.ticketsSold(currentDraw) : BigInt.fromI32(0),
    winTier === selectionSize,
    lottery.expectedPayout(),
  );
}

export function calculateReward(
  netProfit: BigInt,
  fixedReward: BigInt,
  fixedJackpot: BigInt,
  ticketsSold: BigInt,
  isJackpot: boolean,
  expectedPayout: BigInt,
): BigInt {
  const excess = calculateExcessPot(netProfit, fixedJackpot);

  if (isJackpot) {
    return fixedReward.plus(excess.times(EXCESS_BONUS_ALLOCATION).div(PERCENTAGE_BASE));
  }

  const multiplier = calculateMultiplier(excess, ticketsSold, expectedPayout);
  return fixedReward.times(multiplier).div(PERCENTAGE_BASE);
}

function calculateExcessPot(netProfit: BigInt, fixedJackpot: BigInt): BigInt {
  const excessPotSafePercentage = PERCENTAGE_BASE.minus(SAFETY_MARGIN);
  const safeNetProfit = netProfit.times(excessPotSafePercentage).div(PERCENTAGE_BASE);
  const excessPot = safeNetProfit.minus(fixedJackpot);
  return excessPot.gt(BigInt.fromI32(0)) ? excessPot : BigInt.fromI32(0);
}

function calculateMultiplier(excessPot: BigInt, ticketsSold: BigInt, expectedPayout: BigInt): BigInt {
  let bonusMulti = PERCENTAGE_BASE;
  if (excessPot.gt(BigInt.fromI32(0)) && ticketsSold.gt(BigInt.fromI32(0))) {
    const increase = excessPot.times(EXCESS_BONUS_ALLOCATION).div(ticketsSold.times(expectedPayout));
    bonusMulti = bonusMulti.plus(increase);
  }

  return bonusMulti;
}
