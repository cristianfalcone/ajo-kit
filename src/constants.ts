import { context } from 'ajo/context'

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

export const navigate = (to: string) => {
  globalThis.history?.pushState({}, '', to)
}

export class NotFoundError extends Error {
  constructor(path?: string) {
    super(`Route not found${path ? `: ${path}` : ''}`)
  }
}
