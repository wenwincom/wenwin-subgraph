import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { Lottery as LotteryContract } from '../../generated/Lottery/Lottery';
import { Draw, Lottery } from '../../generated/schema';
import { calculateTierReward } from '../utils';

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
  draw.winningTicket = null;
  draw.prizesPerTier = new Array<BigInt>();
  draw.numberOfPlayers = BigInt.fromI32(0);
  draw.players = new Array<string>();
  draw.numberOfWinnersPerTier = new Array<BigInt>();
  draw.numberOfSoldTickets = BigInt.fromI32(0);
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
  const swapWinTier = lottery.swapWinTier;
  const finalTier = calculateJackpot ? selectionSize : selectionSize - 1;
  const prizes = draw.prizesPerTier.length ? draw.prizesPerTier : new Array<BigInt>(selectionSize - swapWinTier + 1);
  for (let tier = swapWinTier; tier <= finalTier; ++tier) {
    prizes[tier - swapWinTier] = calculateTierReward(lotteryContract, draw.drawId, tier, selectionSize);
  }
  draw.prizesPerTier = prizes;
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
