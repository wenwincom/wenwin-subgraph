import { BigInt } from '@graphprotocol/graph-ts';
import {
  ClaimedTicket,
  FinishedExecutingDraw,
  InitialPotPeriodFinalized,
  Lottery,
  NewTicket,
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
  setDrawPrizesPerTier,
} from './entities';
import { unpackTicket } from './utils';

export function handleInitialPotPeriodFinalized(event: InitialPotPeriodFinalized): void {
  const lottery = Lottery.bind(event.address);
  const draw = createOrLoadDraw(BigInt.fromI32(0));
  setDrawPrizesPerTier(draw, lottery);
  draw.save();
}

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

  const lottery = Lottery.bind(event.address);
  const draw = createOrLoadDraw(drawId);
  addPlayerToDraw(draw, player);
  if (drawId.equals(lottery.currentDraw())) {
    // Calculate non-jackpot prizes only for current draw
    setDrawPrizesPerTier(draw, lottery, false);
  }
  draw.save();
}

export function handleFinishedExecutingDraw(event: FinishedExecutingDraw): void {
  const winningTicket = event.params.winningTicket;
  const drawId = event.params.drawId;
  const lottery = Lottery.bind(event.address);
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
  setDrawPrizesPerTier(draw, lottery);
  draw.save();

  const nextDraw = createOrLoadDraw(drawId.plus(BigInt.fromI32(1)));
  setDrawPrizesPerTier(nextDraw, lottery);
  nextDraw.save();
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
