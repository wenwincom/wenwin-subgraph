import { BigInt } from '@graphprotocol/graph-ts';

export function unpackTicket(packedTicket: BigInt, selectionSize: i32, selectionMax: i32): i32[] {
  const unpackedTicket = new Array<i32>(selectionSize);
  let numberOfSelected = 0;
  for (let i = 0; i < selectionMax; i++) {
    const mask = BigInt.fromI32(1).leftShift(<u8>i);
    if (packedTicket.bitAnd(mask).notEqual(BigInt.fromI32(0))) {
      unpackedTicket[numberOfSelected++] = i + 1;
    }
  }
  return unpackedTicket;
}
