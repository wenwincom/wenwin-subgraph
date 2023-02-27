import { BigInt } from '@graphprotocol/graph-ts';
import { TicketCombination } from '../../generated/schema';
import { packCombination } from '../utils';

export function createOrLoadTicketCombination(drawId: BigInt, combination: number[]): TicketCombination {
  const combinationId = getCombinationId(drawId, combination);

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
): void {
  if (len === 0) {
    const ticketCombination = createOrLoadTicketCombination(drawId, result);
    ticketCombination.numberOfTickets = ticketCombination.numberOfTickets.plus(BigInt.fromI32(1));
    ticketCombination.save();
    return;
  }

  for (let i: number = start; i <= input.length - len; i++) {
    result[<i32>result.length - <i32>len] = input[<i32>i];
    saveTicketCombinations(input, len - 1, i + 1, result, drawId);
  }
}

export function findNumberOfWinningCombinationsPerTier(
  input: number[],
  len: number,
  start: number,
  result: number[],
  drawId: BigInt,
): BigInt {
  let numberOfWinningCombinations = BigInt.fromI32(0);
  if (len === 0) {
    const ticketCombination = TicketCombination.load(getCombinationId(drawId, result));
    if (ticketCombination === null) {
      return BigInt.fromI32(0);
    }
    return ticketCombination.numberOfTickets;
  }

  for (let i = start; i <= input.length - len; i++) {
    result[<i32>result.length - <i32>len] = input[<i32>i];
    numberOfWinningCombinations = numberOfWinningCombinations.plus(
      findNumberOfWinningCombinationsPerTier(input, len - 1, i + 1, result, drawId),
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

function getCombinationId(drawId: BigInt, combination: number[]): string {
  const packedCombination = packCombination(combination);
  return drawId.toString() + '_' + packedCombination.toHexString();
}

function factorial(num: number): number {
  return num === 1 ? num : num * factorial(num - 1);
}

function combination(n: number, r: number): number {
  return factorial(n) / (factorial(r) * factorial(n - r));
}
