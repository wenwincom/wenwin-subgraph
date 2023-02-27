import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Ticket } from '../../generated/schema';

export function createOrLoadTicket(ticketId: BigInt, drawId: BigInt, packedTicket: BigInt, player: Address): Ticket {
  const savedTicket = Ticket.load(ticketId.toString());
  if (savedTicket !== null) {
    return savedTicket;
  }

  const ticket = new Ticket(ticketId.toString());
  ticket.draw = drawId;
  ticket.combination = packedTicket.toHexString();
  ticket.owner = player.toHexString();
  ticket.isClaimed = false;
  return ticket;
}
