import { context } from 'ajo/context'
import type { QueryClient } from '@tanstack/query-core'

export const QueryClientContext = context<QueryClient>()

export interface CartItem {
  id: number | string
  name: string
  price: number
  qty: number
  image?: string
}

export interface Cart {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'>) => void
  update: (id: CartItem['id'], quantity: number) => void
  remove: (id: CartItem['id']) => void
  count: number
  total: number
}

export const CartContext = context<Cart>({
  items: [],
  add: () => { },
  update: () => { },
  remove: () => { },
  count: 0,
  total: 0,
})

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Theme {
  mode: ThemeMode
  set: (next: ThemeMode) => void
  cycle: () => void
}

export const ThemeContext = context<Theme>({
  mode: 'system',
  set: () => { },
  cycle: () => { },
})
