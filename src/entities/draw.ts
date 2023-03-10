import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { Lottery as LotteryContract } from '../../generated/Lottery/Lottery';
import { Draw, Lottery, Ticket } from '../../generated/schema';
import { calculateTierReward, unpackTicket } from '../utils';

export function createOrLoadDraw(drawId: BigInt, lottery: LotteryContract): Draw {
  const lotteryAddress = lottery._address.toHexString();
  const internalDrawId = `${lotteryAddress}_${drawId.toString()}`;
  const savedDraw = Draw.load(internalDrawId);
  if (savedDraw !== null) {
    return savedDraw;
  }

  const draw = new Draw(internalDrawId);
  draw.drawId = drawId;
  draw.scheduledTimestamp = lottery.drawScheduledAt(drawId);
  draw.winningCombination = null;
  draw.prizesPerTier = new Array<BigInt>();
  draw.numberOfPlayers = BigInt.fromI32(0);
  draw.players = new Array<string>();
  draw.numberOfWinnersPerTier = null;
  draw.numberOfSoldTickets = BigInt.fromI32(0);
  draw.tickets = new Array<BigInt>();
  return draw;
}

export function setDrawPrizesPerTier(
  draw: Draw,
  lotteryContract: LotteryContract,
  calculateJackpot: boolean = true,
): void {
  const lotteryAddress = lotteryContract._address.toHexString();
  const lottery = Lottery.load(lotteryAddress);
  if (lottery === null) {
    log.warning('setDrawPrizesPerTier: Lottery with address {} not found for draw {}', [
      lotteryAddress,
      draw.id.toString(),
    ]);
    return;
  }

  const selectionSize = lottery.selectionSize;
  const minWinningTier = lottery.minWinningTier;
  const finalTier = calculateJackpot ? selectionSize : selectionSize - 1;
  const prizes = draw.prizesPerTier.length ? draw.prizesPerTier : new Array<BigInt>(selectionSize - minWinningTier + 1);
  for (let tier = minWinningTier; tier <= finalTier; ++tier) {
    prizes[tier - minWinningTier] = calculateTierReward(lotteryContract, draw.drawId, tier, selectionSize);
  }
  draw.prizesPerTier = prizes;
}

export function setNumberOfDrawWinnersPerTier(draw: Draw, lottery: Lottery, winningTicket: BigInt): void {
  const winningCombinationNumbers = unpackTicket(winningTicket, lottery.selectionSize, lottery.selectionMax);
  const winningCombination = new Set<number>();
  for (let i = 0; i < winningCombinationNumbers.length; i++) {
    winningCombination.add(winningCombinationNumbers[i]);
  }

  const numberOfWinnersPerTier = new Array<BigInt>(lottery.selectionSize - lottery.minWinningTier + 1);
  numberOfWinnersPerTier.fill(BigInt.fromI32(0));

  for (let i = 0; i < draw.tickets.length; i++) {
    const ticketInternalId = `${lottery.id}_${draw.tickets[i].toString()}`;
    const ticket = Ticket.load(ticketInternalId);
    if (ticket === null) {
      log.warning('setNumberOfDrawWinnersPerTier: Ticket with id {} not found', [ticketInternalId]);
      continue;
    }

    let winningTier = 0;
    for (let j = 0; j < ticket.combination.length; j++) {
      if (winningCombination.has(ticket.combination[j])) {
        winningTier++;
      }
    }

    if (winningTier >= lottery.minWinningTier) {
      const index = winningTier - lottery.minWinningTier;
      numberOfWinnersPerTier[index] = numberOfWinnersPerTier[index].plus(BigInt.fromI32(1));
    }
  }

  draw.numberOfWinnersPerTier = numberOfWinnersPerTier;
}

export function addPlayerToDraw(draw: Draw, player: Address): void {
  const players = new Set<string>();
  for (let i = 0; i < draw.players.length; i++) {
    players.add(draw.players[i]);
  }
  players.add(player.toHexString());
  draw.players = players.values();
  draw.numberOfPlayers = BigInt.fromI32(players.size);
}

export function addTicketToDraw(draw: Draw, ticketId: BigInt): void {
  const tickets = draw.tickets;
  tickets.push(ticketId);
  draw.tickets = tickets;
  draw.numberOfSoldTickets = BigInt.fromI32(tickets.length);
}
