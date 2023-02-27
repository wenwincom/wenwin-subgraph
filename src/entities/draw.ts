import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Draw } from '../../generated/schema';

export function createOrLoadDraw(drawId: BigInt): Draw {
  const savedDraw = Draw.load(drawId.toString());
  if (savedDraw !== null) {
    return savedDraw;
  }

  const draw = new Draw(drawId.toString());
  draw.id = drawId.toString();
  draw.winningTicket = null;
  draw.jackpotSize = BigInt.fromI32(0);
  draw.numberOfPlayers = BigInt.fromI32(0);
  draw.players = new Array<string>();
  draw.numberOfWinnersPerTier = new Array<BigInt>();
  return draw;
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
