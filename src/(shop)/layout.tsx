import type { Children, Stateful } from 'ajo'
import { CartContext, CartItem } from '/src/constants'

type Args = { children: Children }

const Layout: Stateful<Args, 'section'> = function* (args) {

  let items: CartItem[] = []

  const raw = globalThis.localStorage?.getItem('cart.v1')

  if (raw) try {

    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) items = parsed

  } catch { }

  const find = (id: CartItem['id']) => items.find(i => i.id === id)

  const add = (item: Omit<CartItem, 'qty'>) => this.next(() => {

    const existing = find(item.id)

    if (existing) existing.qty += 1

    else items.push({ ...item, qty: 1 })
  })

  const update = (id: CartItem['id'], quantity: number) => this.next(() => {

    const it = find(id)

    if (!it) return

    it.qty = quantity

    if (it.qty <= 0) items = items.filter(i => i.id !== id)
  })

  const remove = (id: CartItem['id']) => this.next(() => items = items.filter(i => i.id !== id))

  const persist = () => {
    try { globalThis.localStorage?.setItem('cart.v1', JSON.stringify(items)) } catch { }
  }

  globalThis.window?.addEventListener('beforeunload', persist)

  try {

    while (true) {

      const count = items.reduce((a, i) => a + i.qty, 0)

      const total = items.reduce((a, i) => a + i.qty * i.price, 0)

      CartContext({ items, add, update, remove, count, total })

      const path = typeof location !== 'undefined' ? location.pathname : ''

      yield (
        <>
          <div class="relative overflow-hidden panel px-5 py-4 border-emerald-600/25 dark:border-emerald-400/25 bg-gradient-to-r from-emerald-600/12 via-emerald-500/6 to-transparent dark:from-emerald-600/10 dark:via-emerald-500/5">
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute -inset-px opacity-20 dark:opacity-25 bg-[radial-gradient(circle_at_85%_35%,rgba(16,185,129,.35),transparent_60%)]" />
            </div>
            <div class="relative flex items-center justify-between gap-6 flex-wrap">
              <a href="/products" class="text-base font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">Shop</a>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-200/90 bg-emerald-600/10 dark:bg-black/30 rounded-md p-1 ring-1 ring-emerald-600/30 dark:ring-emerald-400/25">
                  <span class="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-600/20 dark:bg-emerald-500/25">
                    <span class="i-lucide-shopping-cart w-3.5 h-3.5" />
                  </span>
                  <span class="tabular-nums font-semibold text-emerald-800 dark:text-emerald-200">{count}</span>
                  <span class="opacity-40">items</span>
                  <span class="opacity-40">·</span>
                  <span class="tabular-nums">${total.toFixed(2)}</span>
                  {count > 0 && <button class="text-emerald-700/70 dark:text-emerald-300/70 hover:text-emerald-700 dark:hover:text-emerald-200 transition px-1" set:onclick={() => this.next(() => items = [])}>Clear</button>}
                </div>
                {path !== '/checkout' && (
                  <a href="/checkout" class="text-[11px] px-3 py-1 rounded-md bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-800 dark:bg-emerald-500/25 dark:hover:bg-emerald-500/35 dark:text-emerald-100 font-medium transition ring-1 ring-emerald-600/30 dark:ring-emerald-400/30">Checkout</a>
                )}
              </div>
            </div>
          </div>
          {args.children}
        </>
      )
    }
  } finally {
    persist()
  }
}

Layout.is = 'section'
Layout.attrs = { class: 'pt-8 space-y-12' }

export default Layout
