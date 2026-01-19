import type { Stateful } from 'ajo'
import type { LoaderArgs } from '/src/constants'
import { CartContext } from '/src/constants'
import { Button } from '/src/ui/button'
import { Image } from '/src/ui/image'

interface Product {
  id: number
  title: string
  price: number
  description: string
  thumbnail: string
  images: string[]
}

export async function load({}: LoaderArgs) {
  const res = await fetch('https://dummyjson.com/products?limit=18')
  if (!res.ok) throw new Error('Failed to fetch products')
  const { products } = await res.json()
  return { products }
}

const ProductsGrid: Stateful<{ products: Product[] }> = function* ({ products }) {

  while (true) {

    const cart = CartContext()

    yield (
      <>
        {products.map(p => {
          const existing = cart.items.find(i => i.id === p.id)
          const qty = existing?.qty ?? 0
          return (
            <div key={p.id} class="panel overflow-hidden flex flex-col group bg-gradient-to-b from-white to-white/90 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.015] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
              <a href={`/products/${p.id}`} class="aspect-[4/3] bg-slate-200/60 dark:bg-black/30 block overflow-hidden relative">
                <Image src={p.thumbnail} alt={p.title} class="group-hover:scale-105 duration-500" aspect="4/3" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/15 via-black/0 dark:from-black/70 opacity-0 group-hover:opacity-100 transition" />
              </a>
              <div class="p-4 flex-1 flex flex-col">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-sm font-medium tracking-tight text-slate-800 dark:text-white/90 leading-snug line-clamp-2 flex-1 min-w-0"><a href={`/products/${p.id}`}>{p.title}</a></h3>
                  <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap drop-shadow-[0_0_2px_rgba(0,0,0,0.4)]">${p.price}</p>
                </div>
                <div class="mt-auto pt-4">
                  {qty === 0 ? (
                    <Button variant="primary" size="xs" class="w-full justify-center shadow-sm dark:shadow-none" set:onclick={() => cart.add({ id: p.id, name: p.title, price: p.price, image: p.thumbnail })}>Add to Cart</Button>
                  ) : (
                    <div class="flex items-center justify-between gap-3">
                      <div class="inline-flex items-center gap-1 bg-slate-900/5 dark:bg-white/5 rounded-md p-1 ring-1 ring-slate-200 dark:ring-white/10">
                        <Button variant="bare" size="xs" class="h-6 w-6 justify-center" set:onclick={() => cart.update(p.id, qty - 1)}>-</Button>
                        <span class="text-xs tabular-nums px-1 font-medium">{qty}</span>
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

const Page = ({ data }: { data: { products: Product[] } }) =>
  <article class="space-y-8 mb-24">
    <header class="space-y-2">
      <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Products</h2>
      <p class="text-sm text-slate-600 dark:text-gray-300/70">Browse sample inventory from a public API.</p>
    </header>
    <section class="space-y-6">
      <ProductsGrid products={data.products} />
    </section>
  </article>

export default Page
