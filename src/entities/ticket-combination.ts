import { Address, BigInt } from '@graphprotocol/graph-ts';
import { TicketCombination } from '../../generated/schema';
import { packCombination } from '../utils';

export function createOrLoadTicketCombination(
  lotteryAddress: Address,
  drawId: BigInt,
  combination: number[],
  selectionSize: i32,
): TicketCombination {
  const combinationId = getCombinationId(lotteryAddress, drawId, combination, selectionSize);

  const savedTicketCombination = TicketCombination.load(combinationId);
  if (savedTicketCombination !== null) {
    return savedTicketCombination;
  }

  const ticketCombination = new TicketCombination(combinationId);
  ticketCombination.numberOfTickets = BigInt.fromI32(0);
  return ticketCombination;
}

export function saveTicketCombinations(
  input: number[],
  len: number,
  start: number,
  result: number[],
  drawId: BigInt,
  lotteryAddress: Address,
  selectionSize: i32,
): void {
  if (len === 0) {
    const ticketCombination = createOrLoadTicketCombination(lotteryAddress, drawId, result, selectionSize);
    ticketCombination.numberOfTickets = ticketCombination.numberOfTickets.plus(BigInt.fromI32(1));
    ticketCombination.save();
    return;
  }

  for (let i: number = start; i <= input.length - len; i++) {
    result[<i32>result.length - <i32>len] = input[<i32>i];
    saveTicketCombinations(input, len - 1, i + 1, result, drawId, lotteryAddress, selectionSize);
  }
}

export function findNumberOfWinningCombinationsPerTier(
  input: number[],
  len: number,
  start: number,
  result: number[],
  drawId: BigInt,
  lotteryAddress: Address,
  selectionSize: i32,
): BigInt {
  let numberOfWinningCombinations = BigInt.fromI32(0);
  if (len === 0) {
    const ticketCombination = TicketCombination.load(getCombinationId(lotteryAddress, drawId, result, selectionSize));
    if (ticketCombination === null) {
      return BigInt.fromI32(0);
    }
    return ticketCombination.numberOfTickets;
  }

  for (let i = start; i <= input.length - len; i++) {
    result[<i32>result.length - <i32>len] = input[<i32>i];
    numberOfWinningCombinations = numberOfWinningCombinations.plus(
      findNumberOfWinningCombinationsPerTier(input, len - 1, i + 1, result, drawId, lotteryAddress, selectionSize),
    );
  }

  return numberOfWinningCombinations;
}

export function calculateNumberOfAlreadyAdded(numberOfWinningCombinations: BigInt[], currentTier: number): BigInt {
  let numberOfAlreadyAdded = BigInt.fromI32(0);
  for (let counter = currentTier; counter < numberOfWinningCombinations.length; counter++) {
    numberOfAlreadyAdded = numberOfAlreadyAdded.plus(
      numberOfWinningCombinations[<i32>counter].times(
        BigInt.fromI32(<i32>combination(<i32>counter + 1, <i32>currentTier)),
      ),
    );
  }
  return numberOfAlreadyAdded;
}

function getCombinationId(lotteryAddress: Address, drawId: BigInt, combination: number[], selectionMax: i32): string {
  const packedCombination = packCombination(combination, selectionMax);
  return `${lotteryAddress.toHexString()}_${drawId.toString()}_${packedCombination.toHexString()}`;
}

function factorial(num: number): number {
  return num === 1 ? num : num * factorial(num - 1);
}

function combination(n: number, r: number): number {
  return factorial(n) / (factorial(r) * factorial(n - r));
}
