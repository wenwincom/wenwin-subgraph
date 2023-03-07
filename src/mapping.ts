import { BigInt, log } from '@graphprotocol/graph-ts';
import {
  ClaimedTicket,
  FinishedExecutingDraw,
  InitialPotPeriodFinalized,
  Lottery as LotteryContract,
  LotteryDeployed,
  NewTicket,
} from '../generated/Lottery/Lottery';
import { Lottery, Ticket } from '../generated/schema';
import {
  addPlayerToDraw,
  calculateNumberOfAlreadyAdded,
  createOrLoadDraw,
  createOrLoadLottery,
  createOrLoadTicket,
  findNumberOfWinningCombinationsPerTier,
  saveTicketCombinations,
  setDrawPrizesPerTier,
} from './entities';
import { unpackTicket } from './utils';

export function handlerLotteryDeployed(event: LotteryDeployed): void {
  const lotteryAddress = event.address.toHexString();
  const selectionSize = event.params.selectionSize;
  const selectionMax = event.params.selectionMax;
  const fixedRewards = event.params.fixedRewards;
  const lottery = createOrLoadLottery(lotteryAddress, selectionSize, selectionMax, fixedRewards);
  lottery.save();
}

export function handleInitialPotPeriodFinalized(event: InitialPotPeriodFinalized): void {
  const lottery = LotteryContract.bind(event.address);
  const draw = createOrLoadDraw(BigInt.fromI32(0), lottery);
  setDrawPrizesPerTier(draw, lottery);
  draw.save();
}

export function handleNewTicket(event: NewTicket): void {
  const lotteryAddress = event.address;
  const ticketId = event.params.ticketId;
  const packedTicket = event.params.combination;
  const drawId = event.params.currentDraw;
  const player = event.params.user;

  const ticket = createOrLoadTicket(ticketId, drawId, packedTicket, player, lotteryAddress);
  ticket.save();

  const lottery = Lottery.load(lotteryAddress.toHexString());
  if (lottery === null) {
    log.warning('handleNewTicket: Lottery not found: {}', [lotteryAddress.toHexString()]);
    return;
  }

  const unpackedTicket = unpackTicket(packedTicket, lottery.selectionSize, lottery.selectionMax);

  for (let counter = lottery.swapWinTier; counter <= lottery.selectionSize; counter++) {
    const result: number[] = new Array(counter);
    saveTicketCombinations(unpackedTicket, counter, 0, result, drawId, lotteryAddress, lottery.selectionSize);
  }

  const lotteryContract = LotteryContract.bind(lotteryAddress);
  const draw = createOrLoadDraw(drawId, lotteryContract);
  addPlayerToDraw(draw, player);
  if (drawId.equals(lotteryContract.currentDraw())) {
    // Calculate non-jackpot prizes only for current draw
    setDrawPrizesPerTier(draw, lotteryContract, false);
  }
  draw.save();
}

export function handleFinishedExecutingDraw(event: FinishedExecutingDraw): void {
  const lotteryAddress = event.address;
  const winningTicket = event.params.winningTicket;
  const drawId = event.params.drawId;
  const lotteryContract = LotteryContract.bind(lotteryAddress);
  const lottery = Lottery.load(lotteryAddress.toHexString());

  if (lottery === null) {
    log.warning('handleFinishedExecutingDraw: Lottery not found: {}', [lotteryAddress.toHexString()]);
    return;
  }

  const unpackedTicket = unpackTicket(winningTicket, lottery.selectionSize, lottery.selectionMax);

  // Check if there is a jackpot winner
  const result: number[] = new Array(lottery.selectionSize);
  let numberOfWinningCombinationsPerTier = findNumberOfWinningCombinationsPerTier(
    unpackedTicket,
    lottery.selectionSize,
    0,
    result,
    drawId,
    lotteryAddress,
    lottery.selectionSize,
  );
  if (numberOfWinningCombinationsPerTier > BigInt.fromI32(0)) {
    return;
  }

  // Non jackpot winner tiers
  const numberOfWinningCombinations: BigInt[] = new Array(lottery.selectionSize - 1);
  numberOfWinningCombinations.fill(BigInt.fromI32(0));
  let numberOfAlreadyAdded: BigInt = BigInt.fromI32(0);
  for (let counter = lottery.selectionSize - 1; counter >= lottery.swapWinTier; counter--) {
    const result: number[] = new Array(counter);
    numberOfWinningCombinationsPerTier = findNumberOfWinningCombinationsPerTier(
      unpackedTicket,
      counter,
      0,
      result,
      drawId,
      lotteryAddress,
      lottery.selectionSize,
    );
    numberOfAlreadyAdded = calculateNumberOfAlreadyAdded(numberOfWinningCombinations, counter);

    numberOfWinningCombinations[counter - 1] = numberOfWinningCombinationsPerTier.minus(numberOfAlreadyAdded);
  }

  const draw = createOrLoadDraw(drawId, lotteryContract);
  draw.winningTicket = winningTicket.toHexString();
  draw.numberOfWinnersPerTier = numberOfWinningCombinations;
  setDrawPrizesPerTier(draw, lotteryContract);
  draw.save();

  const nextDraw = createOrLoadDraw(drawId.plus(BigInt.fromI32(1)), lotteryContract);
  setDrawPrizesPerTier(nextDraw, lotteryContract);
  nextDraw.save();
}

export function handleClaimedTicket(event: ClaimedTicket): void {
  const ticketId = event.params.ticketId;
  const internalTicketId = `${event.address.toHexString()}_${ticketId.toString()}`;
  const ticket = Ticket.load(internalTicketId);
  if (ticket === null) {
    log.warning('handleClaimedTicket: Ticket not found: {}', [internalTicketId]);
    return;
  }
  ticket.isClaimed = true;
  ticket.save();
}
