import { BigInt } from '@graphprotocol/graph-ts';

export function unpackTicket(packedTicket: BigInt, selectionSize: i32, selectionMax: i32): i32[] {
  const unpackedTicket = new Array<i32>(selectionSize);
  let mask = BigInt.fromI32(1);
  for (let counter = 0, chosenNumbersCounter = 0; counter < selectionMax; counter++) {
    if (packedTicket.bitAnd(mask) != BigInt.fromI32(0)) {
      unpackedTicket[chosenNumbersCounter++] = counter + 1;
    }
    mask = mask.leftShift(1);
  }
  return unpackedTicket;
}

export function packCombination(combination: i32[], selectionMax: i32): BigInt {
  let packedCombination = BigInt.fromI32(0);
  let mask = BigInt.fromI32(1);
  for (
    let counter = 0, combinationCounter = 0;
    counter < selectionMax && combinationCounter < combination.length;
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
