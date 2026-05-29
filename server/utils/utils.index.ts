import { markPrices, orderBooks, users } from "../../state";

export function getOrderBook(symbol: string) {
  if (!orderBooks[symbol]) {
    orderBooks[symbol] = { bids: {}, asks: {} };
  }

  return orderBooks[symbol]!;
}

export function recalculatePnl(userId: string) {
  const user = users.find(u => u.userId === userId);
  if (!user) return;

  for (const position of user.positions) {
    const mark = markPrices[position.symbol] ?? position.averageEntryPrice;
    if (position.side === "long") {
      position.unrealizedPnl = (mark - position.averageEntryPrice) * position.quantity;
    } else {
      position.unrealizedPnl = (position.averageEntryPrice - mark) * position.quantity;
    }
  }
}


export function updatePosition(
  userId: string,
  symbol: string,
  side: "long" | "short",
  fillPrice: number,
  fillQty: number,
  leverage: number
) {
  const user = users.find(u => u.userId === userId);
  if (!user) return;

  let pos = user.positions.find(p => p.symbol === symbol && p.side === side);

  const fillMargin = (fillPrice * fillQty) / leverage;

  if (!pos) {
    const liqPrice =
      side === "long"
        ? fillPrice * (1 - 1 / leverage + 0.005)
        : fillPrice * (1 + 1 / leverage - 0.005);

    user.positions.push({
      symbol: symbol as "BTC-PERPS",
      side,
      quantity: fillQty,
      averageEntryPrice: fillPrice,
      margin: fillMargin,
      unrealizedPnl: 0,
      liquidationPrice: liqPrice
    });

  } else {

    const totalQty = pos.quantity + fillQty;
    const newAvg = (pos.averageEntryPrice * pos.quantity + fillPrice * fillQty) / totalQty;

    const newMargin = pos.margin + fillMargin;
    const effLeverage = (newAvg * totalQty) / newMargin;

    pos.averageEntryPrice = newAvg;
    pos.quantity = totalQty;
    pos.margin = newMargin;
    pos.liquidationPrice =
      side === "long"
        ? newAvg * (1 - 1 / effLeverage + 0.005)
        : newAvg * (1 + 1 / effLeverage - 0.005);
  }

  recalculatePnl(userId);
}

