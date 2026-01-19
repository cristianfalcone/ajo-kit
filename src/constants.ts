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

// Route errors with HTTP status codes

export class RouteError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export class NotFoundError extends RouteError {
  constructor(path?: string) {
    super(404, `Route not found${path ? `: ${path}` : ''}`)
  }
}

export class ForbiddenError extends RouteError {
  constructor(message = 'Access denied') {
    super(403, message)
  }
}

export class UnauthorizedError extends RouteError {
  constructor(message = 'Authentication required') {
    super(401, message)
  }
}
