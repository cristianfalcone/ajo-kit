import type { Stateful } from 'ajo'
import { CartContext } from '/src/constants'
import { Button } from '/src/ui/button'

interface Product {
  id: number
  title: string
  price: number
  description: string
  thumbnail: string
  images: string[]
}

const ProductsGrid: Stateful = function* () {

  let products: Product[] = []
  let loading = true
  let error: string | null = null

  fetch('https://dummyjson.com/products?limit=18')
    .then(r => {
      if (!r.ok) throw new Error('Failed products')
      return r.json()
    })
    .then(json => products = json.products)
    .catch(e => error = e.message)
    .finally(() => this.next(() => loading = false))

  while (true) {

    const cart = CartContext()

    if (loading) {

      yield (
        <>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} class="panel overflow-hidden flex flex-col animate-pulse bg-slate-900/5 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
              <div class="aspect-[4/3] bg-slate-900/5 dark:bg-white/5" />
              <div class="p-4 space-y-3">
                <div class="h-4 w-2/3 bg-slate-900/5 dark:bg-white/5 rounded" />
                <div class="h-3 w-1/2 bg-slate-900/5 dark:bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </>
      )

      continue
    }

    if (error) {

      yield <div class="text-sm text-red-300">{error}</div>

      continue
    }

    yield (
      <>
        {products.map(p => {
          const existing = cart.items.find(i => i.id === p.id)
          const qty = existing?.qty || 0
          return (
            <div key={p.id} class="panel overflow-hidden bg-gradient-to-b from-slate-900/5 to-slate-900/[0.02] dark:from-white/5 dark:to-white/[0.02] flex flex-col group">
              <a href={`/products/${p.id}`} class="aspect-[4/3] bg-slate-200/60 dark:bg-black/30 block overflow-hidden relative">
                <img src={p.thumbnail} alt={p.title} class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 dark:from-black/60 opacity-0 group-hover:opacity-100 transition" />
              </a>
              <div class="p-4 flex-1 flex flex-col">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-sm font-medium tracking-tight text-slate-800 dark:text-white/90 leading-snug line-clamp-2 flex-1 min-w-0"><a href={`/products/${p.id}`}>{p.title}</a></h3>
                  <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums whitespace-nowrap">${p.price}</p>
                </div>
                <div class="mt-auto pt-4">
                  {qty === 0 ? (
                    <Button variant="subtle" size="xs" class="w-full justify-center" set:onclick={() => cart.add({ id: p.id, name: p.title, price: p.price, image: p.thumbnail })}>Add to Cart</Button>
                  ) : (
                    <div class="flex items-center justify-between gap-3">
                      <div class="inline-flex items-center gap-1 bg-slate-900/5 dark:bg-black/30 rounded-md p-1 ring-1 ring-slate-200 dark:ring-white/10">
                        <Button variant="bare" size="xs" class="h-6 w-6 justify-center" set:onclick={() => cart.update(p.id, qty - 1)}>-</Button>
                        <span class="text-[11px] tabular-nums px-1 font-medium">{qty}</span>
                        <Button variant="bare" size="xs" class="h-6 w-6 justify-center" set:onclick={() => cart.update(p.id, qty + 1)}>+</Button>
                      </div>
                      <Button variant="danger" size="xs" class="!px-2" set:onclick={() => cart.remove(p.id)} aria-label="Remove item">
                        <span class="i-lucide-trash size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </>
    )
  }
}

ProductsGrid.attrs = { class: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' }

const Page: Stateful<{}, 'article'> = function* () {
  while (true) yield (
    <>
      <header class="space-y-2">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Products</h2>
        <p class="text-sm text-slate-600 dark:text-gray-300/70">Browse sample inventory from a public API.</p>
      </header>
      <section class="space-y-6">
        <ProductsGrid />
      </section>
    </>
  )
}

Page.is = 'article'
Page.attrs = { class: 'space-y-8 mb-24' }

export default Page
