import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { HandlerArgs, PageArgs } from '/src/constants'
import { CartContext, NotFoundError } from '/src/constants'
import { Button } from '/src/ui/button'
import { Image } from '/src/ui/image'

interface Product {
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

export async function handler({ params }: HandlerArgs) {
	const res = await fetch(`https://dummyjson.com/products/${params.id}`)
	if (!res.ok) throw new NotFoundError(`Product with id ${params.id} not found`)
	const product: Product = await res.json()
	return { product }
}

type Args = PageArgs<{ product: Product }>

const Page: Stateful<Args, 'article'> = function* (args) {

	const { product } = args.data!
	let selected = 0

	const setSelected = (i: number) => this.next(() => selected = i)

	while (true) {

		const cart = CartContext()
		const existing = cart.items.find(i => i.id === product.id)
		const qty = existing?.qty ?? 0

		yield (
			<>
				<div class="flex items-center justify-between">
					<Button href="/products" variant="ghost" size="xs">Back</Button>
					<span class="text-xs font-medium tracking-wide text-emerald-700 dark:text-emerald-300/85">{product.category}</span>
				</div>
				<div class="grid md:grid-cols-2 gap-10 items-start">
					<div class="space-y-4">
						<div class="rounded-xl ring-1 ring-slate-200 bg-slate-100 dark:ring-white/10 dark:bg-black/30 overflow-hidden">
							<Image src={product.images[selected] ?? product.thumbnail} alt={product.title} aspect="4/3" />
						</div>
						{product.images.length > 1 && (
							<ul class="flex gap-2 overflow-x-auto pb-1">
								{product.images.map((img: string, i: number) => (
									<li key={i} class="relative">
										<button
											class={clsx(
												'group h-16 w-20 rounded-md overflow-hidden bg-slate-200 border border-slate-300 dark:bg-black/25 dark:border-white/12 transition shadow-sm focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300/70 hover:border-emerald-300/50',
												selected === i && 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/5 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
											)}
											set:onclick={() => setSelected(i)}
											aria-current={selected === i ? 'true' : 'false'}
										>
											<Image
												src={img}
												alt={product.title + ' thumbnail ' + (i + 1)}
												class="group-hover:opacity-95"
												aspect="4/3"
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
								<Button variant="subtle" size="xs" class="px-3" set:onclick={() => cart.add({ id: product.id, name: product.title, price: product.price, image: product.thumbnail })}>Add to Cart</Button>
							) : (
								<div class="flex items-center gap-2 text-xs">
									<Button variant="bare" size="xs" class="h-7 w-7 justify-center" set:onclick={() => cart.update(product.id, qty - 1)}>-</Button>
									<span class="tabular-nums">{qty}</span>
									<Button variant="bare" size="xs" class="h-7 w-7 justify-center" set:onclick={() => cart.update(product.id, qty + 1)}>+</Button>
									<Button variant="danger" size="xs" class="ml-2" set:onclick={() => cart.remove(product.id)} aria-label="Remove item">
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
