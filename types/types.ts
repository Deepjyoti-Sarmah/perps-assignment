import type { NextFunction } from "express"

export type Users = {
  userId: string,
  balance: Balances
  positions: Positions[]
  orders: Order[]
}

export type Balances = {
  availableBalance: number,
  lockedMargin: number
}

export type Positions = {
  symbol: "BTC-PERPS",
  side: "long" | "short"
  quantity: number
  averageEntryPrice: number
  margin: number
  unrealizedPnl: number
  liquidationPrice: number
}

export type Order = {
  orderId: string
  userId: string
  symbol: string
  side: "long" | "short"
  type: "limit" | "market"
  price: number
  quantity: number
  filledQuantity: number
  leverage: number
  postOnly: boolean
  clientOrderId?: string
  status: "resting" | "filled" | "partially_filled" | "cancelled" | "rejected"
  fills: Fill[]
  createdAt: number
}

export type Fill = {
  price: number,
  quantity: number
  makerOrderId: string
  makerUserId: string
  takerUserId: string
}

export type RestingOrder = {
  orderId: string,
  userId: string
  price: number
  quantity: number
}

export type OrderBook = {
  bids: Record<string, RestingOrder>
  asks: Record<string, RestingOrder>
}
