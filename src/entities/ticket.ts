import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Ticket } from '../../generated/schema';

export function createOrLoadTicket(
  ticketId: BigInt,
  drawId: BigInt,
  packedTicket: BigInt,
  player: Address,
  lotteryAddress: Address,
): Ticket {
  const internalId = `${lotteryAddress.toHexString()}_${ticketId.toString()}`;
  const savedTicket = Ticket.load(internalId);
  if (savedTicket !== null) {
    return savedTicket;
  }

  const ticket = new Ticket(internalId);
  ticket.ticketId = ticketId;
  ticket.draw = drawId;
  ticket.combination = packedTicket.toHexString();
  ticket.owner = player.toHexString();
  ticket.isClaimed = false;
  return ticket;
}
