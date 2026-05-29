import type { Users } from "./types/types";

export let users: Users[] = [
  {
    userId: "alice",
    balance: { availableBalance: 0, lockedMargin: 0 },
    positions: [],
    orders: []
  },
  {
    userId: "bob",
    balance: { availableBalance: 0, lockedMargin: 0 },
    positions: [],
    orders: []
  }
];

export type OrderBookEntry = {
  orderId: string;
  userId: string;
  price: number;
  quantity: number;
};

export let orderBooks: Record<string, {
  bids: Record<string, OrderBookEntry>;
  asks: Record<string, OrderBookEntry>;
}> = {};

export let markPrices: Record<string, number> = {};

export let insuranceFunds: Record<string, number> = {};

export let fundingEvents: Array<{ symbol: string; rate: number; time: number }> = [];

export let adlEvents: Array<{ symbol: string; userId: string; quantity: number; time: number }> = [];

let orderCounter = 0;

export function getNextOrderId(): string {
  return `order-${orderCounter++}`;
}

export function resetState(): void {
  users.length = 0;

  users.push(
    {
      userId: "alice",
      balance: { availableBalance: 0, lockedMargin: 0 },
      positions: [],
      orders: []
    },
    {
      userId: "bob",
      balance: { availableBalance: 0, lockedMargin: 0 },
      positions: [],
      orders: []
    }
  );

  for (const key in orderBooks) delete orderBooks[key];

  for (const key in markPrices) delete markPrices[key];

  for (const key in insuranceFunds) delete insuranceFunds[key];

  fundingEvents.length = 0;

  adlEvents.length = 0;

  orderCounter = 0;
}
