import { Stateful } from 'ajo'
import { CartContext } from '/src/constants'
import { Button } from '/src/ui/button'

const Page: Stateful<{}, 'article'> = () => {

  const cart = CartContext()

  const subTotal = () => cart.items.reduce((a, i) => a + i.price * i.qty, 0)

  return (
    <>
      <header class="space-y-2">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Checkout</h2>
        <p class="text-sm text-slate-600 dark:text-gray-300/70">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      </header>
      <section class="panel p-6">
        {cart.items.length === 0 ? (
          <p class="text-sm text-slate-600 dark:text-gray-400">Your cart is empty.</p>
        ) : (
          <div class="space-y-4">
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-xs align-middle">
                <thead class="text-slate-500 dark:text-gray-400 text-[11px] uppercase tracking-wide">
                  <tr class="border-b border-slate-200 dark:border-white/10 text-left">
                    <th class="py-2 pr-4 font-medium">Product</th>
                    <th class="py-2 pr-4 font-medium">Price</th>
                    <th class="py-2 pr-4 font-medium">Qty</th>
                    <th class="py-2 pr-4 font-medium">Total</th>
                    <th class="py-2"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-white/5">
                  {cart.items.map(it => (
                    <tr key={it.id} class="hover:bg-slate-900/5 dark:hover:bg-white/3">
                      <td class="py-3 pr-4 flex items-center gap-3">
                        <img src={it.image} alt={it.name} class="h-10 w-14 object-cover rounded" />
                        <span class="font-medium text-slate-800 dark:text-gray-200">{it.name}</span>
                      </td>
                      <td class="py-3 pr-4 tabular-nums">${it.price.toFixed(2)}</td>
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-2">
                          <Button variant="bare" size="xs" class="h-6 w-6 justify-center" set:onclick={() => cart.update(it.id, it.qty - 1)}>-</Button>
                          <span class="tabular-nums">{it.qty}</span>
                          <Button variant="bare" size="xs" class="h-6 w-6 justify-center" set:onclick={() => cart.update(it.id, it.qty + 1)}>+</Button>
                        </div>
                      </td>
                      <td class="py-3 pr-4 tabular-nums">${(it.price * it.qty).toFixed(2)}</td>
                      <td class="py-3">
                        <Button variant="danger" size="xs" set:onclick={() => cart.remove(it.id)} aria-label="Remove item">
                          <span class="i-lucide-trash size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul class="md:hidden space-y-3">
              {cart.items.map(it => (
                <li key={it.id} class="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 p-4 space-y-3">
                  <div class="flex items-center gap-3">
                    <img src={it.image} alt={it.name} class="h-14 w-20 object-cover rounded" />
                    <div class="flex-1">
                      <p class="text-xs font-medium text-slate-800 dark:text-gray-200 leading-snug">{it.name}</p>
                      <p class="text-[11px] text-slate-600 dark:text-gray-400 tabular-nums mt-0.5">${it.price.toFixed(2)} each</p>
                    </div>
                    <Button variant="danger" size="xs" class="self-start" set:onclick={() => cart.remove(it.id)} aria-label="Remove item">
                      <span class="i-lucide-trash size-3" />
                    </Button>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Button variant="bare" size="xs" class="h-7 w-7 justify-center" set:onclick={() => cart.update(it.id, it.qty - 1)}>-</Button>
                      <span class="tabular-nums text-xs">{it.qty}</span>
                      <Button variant="bare" size="xs" class="h-7 w-7 justify-center" set:onclick={() => cart.update(it.id, it.qty + 1)}>+</Button>
                    </div>
                    <div class="text-xs tabular-nums font-medium text-emerald-600 dark:text-emerald-300">${(it.price * it.qty).toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <div class="mt-8 grid gap-6 md:grid-cols-3 items-start">
        <div class="md:col-span-2" />
        <div class="space-y-4">
          <div class="rounded-lg border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.04] dark:to-white/[0.02] p-4 text-xs">
            <h3 class="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-gray-400 mb-3">Order Summary</h3>
            <ul class="space-y-2">
              <li class="flex justify-between">
                <span class="text-slate-500 dark:text-gray-400">Subtotal</span>
                <span class="tabular-nums font-medium">${subTotal().toFixed(2)}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-slate-500 dark:text-gray-400">Shipping</span>
                <span class="tabular-nums text-emerald-600/80 dark:text-emerald-300/80">$0.00</span>
              </li>
              <li class="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/10 to-transparent my-2" />
              <li class="flex justify-between text-sm font-semibold">
                <span class="text-emerald-600 dark:text-emerald-300">Total</span>
                <span class="tabular-nums text-emerald-600 dark:text-emerald-300">${subTotal().toFixed(2)}</span>
              </li>
            </ul>
            <div class="mt-4">
              <button
                class="w-full h-9 rounded-md text-[11px] font-semibold tracking-wide uppercase ring-1 transition
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 ring-emerald-600/30 dark:bg-emerald-500/25 dark:hover:bg-emerald-500/35 dark:text-emerald-100 dark:ring-emerald-400/30
                  disabled:hover:bg-emerald-500/20 dark:disabled:hover:bg-emerald-500/25"
                disabled={cart.items.length === 0}
                aria-disabled={cart.items.length === 0 ? 'true' : 'false'}
              >
                Place Order
              </button>
              <p class="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-gray-500">Demo checkout &mdash; no payment is processed.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

Page.is = 'article'
Page.attrs = { class: 'mb-24 space-y-10' }

export default Page
