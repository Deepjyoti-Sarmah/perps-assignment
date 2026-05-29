import { Router, type Request, type Response } from "express";
import type { Order, Fill } from "../types/types";
import {
  users,
  markPrices,
  getNextOrderId,
  resetState
} from "../state";
import { getOrderBook, updatePosition } from "./utils/utils.index";

const routes = Router();


routes.post("/reset", async (_req: Request, res: Response) => {
  resetState();
  return res.status(200).json({
    message: "Reset successful"
  });
});

routes.post("/users", async (req: Request, res: Response) => {
  const { userId, initialBalance } = req.body;

  if (!userId || initialBalance == null) {
    return res.status(400).json({
      error: "userId and initialBalance are required"
    });
  }

  if (users.find(u => u.userId === userId)) {
    return res.status(409).json({
      error: "User already exists"
    });
  }

  users.push({
    userId,
    balance: {
      availableBalance: initialBalance,
      lockedMargin: 0
    },
    positions: [],
    orders: []
  });

  return res.status(200).json({ userId });
});

routes.post("/orders", async (req: Request, res: Response) => {
  const { userId, symbol, side, type, price, quantity, leverage, postOnly, clientOrderId } = req.body;

  const user = users.find(u => u.userId === userId);
  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  if (type === "limit" && (price == null || price <= 0)) {
    return res.status(400).json({
      error: "Limit orders require a valid price"
    });
  }

  const orderBook = getOrderBook(symbol);

  let estimatedPrice = price;
  if (type === "market" && (price == null || price <= 0)) {
    if (side === "long") {
      const bestAsk = Object.values(orderBook.asks).sort((a, b) => a.price - b.price)[0];
      estimatedPrice = bestAsk?.price ?? markPrices[symbol];
    } else {
      const bestBid = Object.values(orderBook.bids).sort((a, b) => b.price - a.price)[0];
      estimatedPrice = bestBid?.price ?? markPrices[symbol];
    }
    if (estimatedPrice == null || estimatedPrice <= 0) {
      return res.status(400).json({ error: "Cannot estimate price for market order" });
    }
  }

  const marginRequired = (estimatedPrice * quantity) / (leverage || 1);

  if (postOnly) {
    let wouldMatch = false;

    if (side === "long") {
      wouldMatch = Object.values(orderBook.asks).some(ask => price >= ask.price);
    }
    else {
      wouldMatch = Object.values(orderBook.bids).some(bid => price <= bid.price);
    }

    if (wouldMatch) {
      return res.status(200).json({
        orderId: getNextOrderId(),
        status: "rejected",
        reason: "post-only would match",
        fills: [],
        remainingQuantity: quantity,
        cancelledQuantity: quantity,
        margin: {
          locked: 0,
          used: 0,
          released: 0
        }
      });
    }
  }

  if (user.balance.availableBalance < marginRequired) {
    return res.status(200).json({
      orderId: getNextOrderId(),
      status: "rejected",
      reason: "insufficient margin",
      fills: [],
      remainingQuantity: quantity,
      cancelledQuantity: quantity,
      margin: {
        locked: 0,
        used: 0,
        released: 0
      }
    });
  }

  user.balance.availableBalance -= marginRequired;
  user.balance.lockedMargin += marginRequired;

  const orderId = getNextOrderId();

  const order: Order = {
    orderId,
    userId,
    symbol,
    side,
    type,
    price,
    quantity,
    filledQuantity: 0,
    leverage: leverage || 1,
    postOnly: postOnly ?? false,
    clientOrderId,
    status: "filled",
    fills: [],
    createdAt: Date.now()
  };

  let remainingQty = quantity;
  const fills: Fill[] = [];
  let usedMargin = 0;

  if (side === "long") {
    const asks = Object.values(orderBook.asks).sort((a, b) => a.price - b.price || a.orderId.localeCompare(b.orderId));

    for (const ask of asks) {
      if (remainingQty <= 0) break;

      if (type === "limit" && price < ask.price) break;

      const matchQty = Math.min(remainingQty, ask.quantity);

      const fillPrice = ask.price;
      const fillMargin = (fillPrice * matchQty) / (leverage || 1);

      fills.push({
        price: fillPrice,
        quantity: matchQty,
        makerOrderId: ask.orderId,
        makerUserId: ask.userId,
        takerUserId: userId
      });

      updatePosition(ask.userId, symbol, "short", fillPrice, matchQty, leverage || 1);
      updatePosition(userId, symbol, "long", fillPrice, matchQty, leverage || 1);

      const maker = users.find(user => user.userId === ask.userId);

      if (maker) {
        maker.balance.lockedMargin -= fillMargin;
      }

      user.balance.lockedMargin -= fillMargin;
      usedMargin += fillMargin;
      remainingQty -= matchQty;

      if (matchQty >= ask.quantity) {
        delete orderBook.asks[ask.orderId];
      }

      else {
        orderBook.asks[ask.orderId]!.quantity -= matchQty;
      }
    }

  } else {

    const bids = Object.values(orderBook.bids).sort((a, b) => b.price - a.price || a.orderId.localeCompare(b.orderId));

    for (const bid of bids) {
      if (remainingQty <= 0) break;

      if (type === "limit" && price > bid.price) break;

      const matchQty = Math.min(remainingQty, bid.quantity);
      const fillPrice = bid.price;
      const fillMargin = (fillPrice * matchQty) / (leverage || 1);

      fills.push({
        price: fillPrice,
        quantity: matchQty,
        makerOrderId: bid.orderId,
        makerUserId: bid.userId,
        takerUserId: userId
      });

      updatePosition(bid.userId, symbol, "long", fillPrice, matchQty, leverage || 1);
      updatePosition(userId, symbol, "short", fillPrice, matchQty, leverage || 1);

      const maker = users.find(u => u.userId === bid.userId);
      if (maker) {
        maker.balance.lockedMargin -= fillMargin;
      }

      user.balance.lockedMargin -= fillMargin;
      usedMargin += fillMargin;
      remainingQty -= matchQty;

      if (matchQty >= bid.quantity) {
        delete orderBook.bids[bid.orderId];
      }
      else {
        orderBook.bids[bid.orderId]!.quantity -= matchQty;
      }
    }
  }

  const filledQty = quantity - remainingQty;
  let status: Order["status"];

  let releasedMargin = 0;
  let cancelledQty = 0;

  if (remainingQty === 0) {
    status = "filled";
    releasedMargin = marginRequired - usedMargin;

    user.balance.lockedMargin -= releasedMargin;
    user.balance.availableBalance += releasedMargin;

  } else if (filledQty > 0) {

    if (type === "market") {
      status = "partially_filled";
      cancelledQty = remainingQty;
      releasedMargin = marginRequired - usedMargin;

      user.balance.lockedMargin -= releasedMargin;
      user.balance.availableBalance += releasedMargin;
    } else {
      status = "partially_filled";

      if (side === "long") {
        orderBook.bids[orderId] = { orderId, userId, price, quantity: remainingQty };
      } else {
        orderBook.asks[orderId] = {
          orderId, userId, price, quantity: remainingQty
        };
      }
    }
  } else {

    if (type === "market") {
      status = "rejected";
      cancelledQty = quantity;
      releasedMargin = marginRequired;

      user.balance.lockedMargin -= marginRequired;
      user.balance.availableBalance += marginRequired;
    } else {
      status = "resting";

      if (side === "long") {
        orderBook.bids[orderId] = { orderId, userId, price, quantity: remainingQty };
      } else {
        orderBook.asks[orderId] = {
          orderId, userId, price, quantity: remainingQty
        };
      }
    }
  }

  order.fills = fills;
  order.filledQuantity = filledQty;
  order.status = status;
  user.orders.push(order);

  const reason = status === "rejected"
    ? "no matching orders"
    : status === "partially_filled"
      && type === "market"
      ? "market order partially filled, remaining cancelled"
      : undefined;

  return res.status(200).json({
    orderId,
    status,
    reason,
    fills,
    remainingQuantity: remainingQty,
    cancelledQuantity: cancelledQty,
    margin: {
      locked: status === "rejected" ? 0 : marginRequired,
      used: usedMargin,
      released: releasedMargin
    }
  });

});

routes.get("/orderbook/:symbol", async (req: Request, res: Response) => {
  const symbol = req.params.symbol as string;
  const book = getOrderBook(symbol);

  const bids = Object.values(book.bids).sort((a, b) =>
    b.price - a.price || a.orderId.localeCompare(b.orderId)
  );

  // Asks: lowest price first, then FIFO (earliest first).
  const asks = Object.values(book.asks).sort((a, b) =>
    a.price - b.price || a.orderId.localeCompare(b.orderId)
  );

  console.log({ symbol, bids, asks })

  return res.status(200).json({ symbol, bids, asks });
});


export default routes;
