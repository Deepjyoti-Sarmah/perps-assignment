import type { NextFunction } from "express"

export type Users = {
  userId: string,
  balance: Balances
  positions: Positions[]
  orders: Oders[]
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

export type Oders = {
  symbol: "BTC-PERPS",
  side: "long" | "short"
  type: "limit" | "market"
  price: number
  quantity: number
  leverage: number
  postOnly: boolean
  clientOderId: string
}

export type Fills = {
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

export type orderBook = {
  bids: Record<string, RestingOrder>
  ask: Record<string, RestingOrder>

}
