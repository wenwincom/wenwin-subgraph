import { BigInt } from '@graphprotocol/graph-ts';
import {
  ClaimedTicket,
  FinishedExecutingDraw,
  Lottery,
  NewTicket,
  StartedExecutingDraw,
} from '../generated/Lottery/Lottery';
import { Ticket } from '../generated/schema';
import { SELECTION_SIZE, SWAP_WIN_TIER } from './constants';
import {
  addPlayerToDraw,
  calculateNumberOfAlreadyAdded,
  createOrLoadDraw,
  createOrLoadTicket,
  findNumberOfWinningCombinationsPerTier,
  saveTicketCombinations,
} from './entities';
import { calculateJackpot, unpackTicket } from './utils';

export function handleNewTicket(event: NewTicket): void {
  const ticketId = event.params.ticketId;
  const packedTicket = event.params.combination;
  const drawId = event.params.currentDraw;
  const player = event.params.user;

  const ticket = createOrLoadTicket(ticketId, drawId, packedTicket, player);
  ticket.save();

  const unpackedTicket = unpackTicket(packedTicket);

  for (let counter = SWAP_WIN_TIER; counter <= SELECTION_SIZE; counter++) {
    const result: number[] = new Array(counter);
    saveTicketCombinations(unpackedTicket, counter, 0, result, drawId);
  }

  const draw = createOrLoadDraw(drawId);
  addPlayerToDraw(draw, player);
  draw.save();
}

export function handleStartedExecutingDraw(event: StartedExecutingDraw): void {
  const drawId = event.params.drawId;
  const lotteryAddress = event.transaction.to;
  if (lotteryAddress === null) {
    return;
  }

  const lottery = Lottery.bind(lotteryAddress);

  const draw = createOrLoadDraw(drawId);
  draw.jackpotSize = calculateJackpot(lottery);
  draw.save();
}

export function handleFinishedExecutingDraw(event: FinishedExecutingDraw): void {
  const winningTicket = event.params.winningTicket;
  const drawId = event.params.drawId;

  const unpackedTicket = unpackTicket(winningTicket);

  // Check if there is a jackpot winner
  const result: number[] = new Array(SELECTION_SIZE);
  let numberOfWinningCombinationsPerTier = findNumberOfWinningCombinationsPerTier(
    unpackedTicket,
    SELECTION_SIZE,
    0,
    result,
    drawId,
  );
  if (numberOfWinningCombinationsPerTier > BigInt.fromI32(0)) {
    return;
  }

  // Non jackpot winner tiers
  const numberOfWinningCombinations: BigInt[] = new Array(SELECTION_SIZE - 1);
  numberOfWinningCombinations.fill(BigInt.fromI32(0));
  let numberOfAlreadyAdded: BigInt = BigInt.fromI32(0);
  for (let counter = SELECTION_SIZE - 1; counter >= SWAP_WIN_TIER; counter--) {
    const result: number[] = new Array(counter);
    numberOfWinningCombinationsPerTier = findNumberOfWinningCombinationsPerTier(
      unpackedTicket,
      counter,
      0,
      result,
      drawId,
    );
    numberOfAlreadyAdded = calculateNumberOfAlreadyAdded(numberOfWinningCombinations, counter);

    numberOfWinningCombinations[counter - 1] = numberOfWinningCombinationsPerTier.minus(numberOfAlreadyAdded);
  }

  const draw = createOrLoadDraw(drawId);
  draw.winningTicket = winningTicket.toHexString();
  draw.numberOfWinnersPerTier = numberOfWinningCombinations;
  draw.save();
}

export function handleClaimedTicket(event: ClaimedTicket): void {
  const ticketId = event.params.ticketId;
  const ticket = Ticket.load(ticketId.toString());
  if (ticket === null) {
    return;
  }
  ticket.isClaimed = true;
  ticket.save();
}
