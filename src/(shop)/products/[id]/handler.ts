import type { HandlerArgs } from '/src/constants'
import { NotFoundError } from '/src/constants'
import { products } from '/src/data'

export async function page({ params }: HandlerArgs) {
	const product = await products.find(Number(params.id))
	if (!product) throw new NotFoundError(`Product ${params.id} not found`)
	return { product }
}
