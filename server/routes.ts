import { Router, type Request, type Response } from "express";
import type { Balances, Users } from "../types/types";

const routes = Router()

routes.post("/reset", async (req: Request, res: Response) => {
  //TODO: reset all users, balances, positions, orders, funding, insurance-fund, and ADL events


})

routes.post("/users", async (req: Request, res: Response) => {
  //req
  //{
  //   "userId": "alice",
  //   "initialBalance": 10000
  // }

  const { userId, initialBalance } = req.body


  const balance: Balances = {
    availableBalance: initialBalance,
    lockedMargin: 0
  }

  users.push(
    userId,
    balance,
    positons: [],
    orders: []
  )



  // res
  // {
  //   "userId": "alice"
  // }
  return res.status(200).json({
    userId: userId
  })

})

routes.get("/users/:userId/balances", async (req: Request, res: Response) => {

})

routes.get("/users/:userId/positions", async (req: Request, res: Response) => {

})


routes.post("/orders", async (req: Request, res: Response) => {
  //   Request
  //   {
  //   "userId": "alice",
  //   "symbol": "BTC-PERP",
  //   "side": "long",
  //   "type": "limit",
  //   "price": 105,
  //   "quantity": 5,
  //   "leverage": 1,
  //   "postOnly": false,
  //   "clientOrderId": "optional-client-id"
  // }
  //
  //
  // Response
  //{
  // "orderId": "order-1",
  // "status": "filled",
  // "reason": "optional reason",
  // "fills": [
  //   {
  //     "price": 105,
  //     "quantity": 5,
  //     "makerOrderId": "order-0",
  //     "makerUserId": "maker",
  //     "takerUserId": "alice"
  //   }
  // ],
  // "remainingQuantity": 0,
  // "cancelledQuantity": 0,
  // "margin": {
  //   "locked": 525,
  //   "used": 525,
  //   "released": 0
  // }
  //
  // Allowed status
  //   resting
  // filled
  // partially_filled
  // cancelled
  // rejected
  // 
  // reject response must include 
  // fills
  // remainingQuantity
  // cancelledQuantity
  // margin
  // reason
  //
  // reason should mention the failure type, for example:

  // - insufficient margin => reason includes "margin"
  // - post-only violation => reason includes "post-only"
  //
  //Rules:
  //
  // - side: "long" means buy.
  // - side: "short" means sell.
  // - type: "limit" requires price.
  // - type: "market" always includes price in these tests. It is used as the pre-trade margin lock (price * quantity / leverage).
  // - Market orders never rest in the book.
  // - Limit orders can rest if not fully matched.
  // - Matching uses maker price.
  // - Bids sort high to low, then FIFO.
  // - Asks sort low to high, then FIFO.
})

routes.get("/orderbook/:symbol", async (req: Request, res: Response) => {

})

routes.post("/mark-price", async (req: Request, res: Response) => {

})

routes.post("/funding", async (req: Request, res: Response) => {

})

routes.get("/insurance-fund/:symbol", async (req: Request, res: Response) => {

})


routes.get("/adl-events", async (req: Request, res: Response) => {

})



export default routes
