import clsx from 'clsx'
import type { Stateful } from 'ajo'
import { CartContext } from '/src/constants'
import { Button } from '/src/ui/button'

type Args = { params: { id: string } }

interface ProductDetail {
  id: number
  title: string
  price: number
  description: string
  images: string[]
  thumbnail: string
  category: string
  brand?: string
  rating?: number
  stock?: number
}

const Page: Stateful<Args, 'article'> = function* (args) {

  let product: ProductDetail | null = null as ProductDetail | null
  let loading = true
  let error: string | null = null
  let selected = 0

  fetch(`https://dummyjson.com/products/${args.params.id}`)
    .then(r => {
      if (!r.ok) throw new Error('Not found')
      return r.json()
    })
    .then(json => product = json)
    .catch(e => error = e.message)
    .finally(() => this.next(() => loading = false))

  const setSelected = (i: number) => this.next(() => selected = i)

  while (true) {

    const cart = CartContext()

    if (loading) {

      yield (
        <>
          <Button href="/products" variant="ghost" size="xs">Back</Button>
          <div class="aspect-[16/9] rounded-xl bg-white/5 animate-pulse" />
          <div class="space-y-3">
            <div class="h-6 w-1/2 bg-white/5 rounded animate-pulse" />
            <div class="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
          </div>
        </>
      )

      continue
    }

    if (error || !product) {

      yield (
        <>
          <Button href="/products" variant="ghost" size="xs">Back</Button>
          <div class="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error || 'Product unavailable'}
          </div>
        </>
      )

      continue
    }

    const existing = cart.items.find(i => i.id === (product as ProductDetail).id)
    const qty = existing?.qty || 0

    yield (
      <>
        <div class="flex items-center justify-between">
          <Button href="/products" variant="ghost" size="xs">Back</Button>
          <span class="text-[11px] font-medium tracking-wide text-emerald-700 dark:text-emerald-300/85">{product.category}</span>
        </div>
        <div class="grid md:grid-cols-2 gap-10 items-start">
          <div class="space-y-4">
            <div class="aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-slate-200 bg-slate-100 dark:ring-white/10 dark:bg-black/30">
              <img src={product.images[selected] || product.thumbnail} alt={product.title} class="w-full h-full object-cover" loading="lazy" />
            </div>
            {(product as ProductDetail).images.length > 1 && (
              <ul class="flex gap-2 overflow-x-auto pb-1">
                {(product as ProductDetail).images.map((img: string, i: number) => (
                  <li key={i} class="relative">
                    <button
                      class={clsx(
                        'group h-16 w-20 rounded-md overflow-hidden bg-slate-200 border border-slate-300 dark:bg-black/25 dark:border-white/12 transition shadow-sm focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300/70 hover:border-emerald-300/50',
                        selected === i && 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/5 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
                      )}
                      set:onclick={() => setSelected(i)}
                      aria-current={selected === i ? 'true' : 'false'}
                    >
                      <img
                        src={img}
                        alt={(product as ProductDetail).title + ' thumbnail ' + (i + 1)}
                        class="w-full h-full object-cover group-hover:opacity-95"
                        loading="lazy"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="space-y-6">
            <header class="space-y-2">
              <h1 class="text-3xl font-bold tracking-tight leading-tight text-balance text-slate-900 dark:text-white">{product.title}</h1>
              <p class="text-sm text-slate-600 dark:text-gray-400/80">{product.brand} · Rating {product.rating} · Stock {product.stock}</p>
            </header>
            <p class="text-sm leading-relaxed text-slate-700 dark:text-gray-300/80">{product.description}</p>
            <div class="flex items-center gap-6">
              <span class="text-3xl font-semibold text-emerald-700 dark:text-emerald-300">${product.price}</span>
              {qty === 0 ? (
                <Button variant="subtle" size="xs" class="px-3" set:onclick={() => cart.add({ id: product!.id, name: product!.title, price: product!.price, image: product!.thumbnail })}>Add to Cart</Button>
              ) : (
                <div class="flex items-center gap-2 text-xs">
                  <Button variant="bare" size="xs" class="h-7 w-7 justify-center" set:onclick={() => cart.update(product!.id, qty - 1)}>-</Button>
                  <span class="tabular-nums">{qty}</span>
                  <Button variant="bare" size="xs" class="h-7 w-7 justify-center" set:onclick={() => cart.update(product!.id, qty + 1)}>+</Button>
                  <Button variant="danger" size="xs" class="ml-2" set:onclick={() => cart.remove(product!.id)} aria-label="Remove item">
                    <span class="i-lucide-trash size-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }
}

Page.is = 'article'
Page.attrs = { class: 'py-14 max-w-5xl mx-auto space-y-10' }

export default Page
