import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Lottery } from '../../generated/Lottery/Lottery';
import { Draw } from '../../generated/schema';
import { SELECTION_SIZE, SWAP_WIN_TIER } from '../constants';
import { calculateTierReward } from '../utils';

export function createOrLoadDraw(drawId: BigInt, lottery: Lottery): Draw {
  const savedDraw = Draw.load(drawId.toString());
  if (savedDraw !== null) {
    return savedDraw;
  }

  const draw = new Draw(drawId.toString());
  draw.id = drawId.toString();
  draw.scheduledTimestamp = lottery.drawScheduledAt(drawId);
  draw.winningTicket = null;
  draw.prizesPerTier = new Array<BigInt>();
  draw.numberOfPlayers = BigInt.fromI32(0);
  draw.players = new Array<string>();
  draw.numberOfWinnersPerTier = new Array<BigInt>();
  return draw;
}

export function setDrawPrizesPerTier(draw: Draw, lottery: Lottery, calculateJackpot: boolean = true): void {
  const finalTier = calculateJackpot ? SELECTION_SIZE : SELECTION_SIZE - 1;
  const prizes = draw.prizesPerTier.length ? draw.prizesPerTier : new Array<BigInt>(SELECTION_SIZE - SWAP_WIN_TIER + 1);
  for (let tier = SWAP_WIN_TIER; tier <= finalTier; ++tier) {
    prizes[tier - SWAP_WIN_TIER] = calculateTierReward(lottery, BigInt.fromString(draw.id), tier);
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
