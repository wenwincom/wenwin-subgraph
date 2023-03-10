import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Lottery, Ticket } from '../../generated/schema';
import { unpackTicket } from '../utils';

export function createOrLoadTicket(
  ticketId: BigInt,
  drawId: BigInt,
  packedTicket: BigInt,
  player: Address,
  lottery: Lottery,
): Ticket {
  const internalId = `${lottery.id}_${ticketId.toString()}`;
  const savedTicket = Ticket.load(internalId);
  if (savedTicket !== null) {
    return savedTicket;
  }

  const ticket = new Ticket(internalId);
  ticket.ticketId = ticketId;
  ticket.draw = `${lottery.id}_${drawId.toString()}`;
  ticket.combination = unpackTicket(packedTicket, lottery.selectionSize, lottery.selectionMax);
  ticket.owner = player.toHexString();
  ticket.isClaimed = false;
  return ticket;
}
