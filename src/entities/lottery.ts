import { BigInt } from '@graphprotocol/graph-ts';
import { Lottery } from '../../generated/schema';

export function createOrLoadLottery(
  lotteryId: string,
  selectionSize: i32,
  selectionMax: i32,
  fixedRewards: BigInt[],
): Lottery {
  const savedLottery = Lottery.load(lotteryId);
  if (savedLottery !== null) {
    return savedLottery;
  }

  const lottery = new Lottery(lotteryId);
  lottery.selectionSize = selectionSize;
  lottery.selectionMax = selectionMax;
  lottery.minWinningTier = getMinWinningTier(fixedRewards);
  return lottery;
}

function getMinWinningTier(fixedRewards: BigInt[]): i32 {
  for (let winTier = 0; winTier < fixedRewards.length; winTier++) {
    if (!fixedRewards[winTier].equals(BigInt.fromI32(0))) {
      return winTier;
    }
  }

  return <i32>fixedRewards.length; // same as selectionSize
}
