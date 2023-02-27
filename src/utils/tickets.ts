import { BigInt } from '@graphprotocol/graph-ts';
import { SELECTION_MAX, SELECTION_SIZE } from '../constants';

export function unpackTicket(packedTicket: BigInt): number[] {
  const unpackedTicket: number[] = new Array(SELECTION_SIZE);
  let mask = BigInt.fromI32(1);
  for (let counter = 0, chosenNumbersCounter = 0; counter < SELECTION_MAX; counter++) {
    if (packedTicket.bitAnd(mask) != BigInt.fromI32(0)) {
      unpackedTicket[chosenNumbersCounter++] = counter + 1;
    }
    mask = mask.leftShift(1);
  }
  return unpackedTicket;
}

export function packCombination(combination: number[]): BigInt {
  let packedCombination = BigInt.fromI32(0);
  let mask = BigInt.fromI32(1);
  for (
    let counter = 0, combinationCounter = 0;
    counter < SELECTION_MAX && combinationCounter < combination.length;
    counter++
  ) {
    if (combination[combinationCounter] === counter + 1) {
      packedCombination = packedCombination.bitOr(mask);
      combinationCounter++;
    }
    mask = mask.leftShift(1);
  }
  return packedCombination;
}
