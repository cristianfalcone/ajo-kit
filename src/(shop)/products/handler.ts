import type { HandlerArgs } from '/src/constants'
import { products } from '/src/data'

export async function page({}: HandlerArgs) {
	return { products: await products.all(18) }
}
