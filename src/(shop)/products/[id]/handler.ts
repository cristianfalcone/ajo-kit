import type { Request } from 'polka'
import { NotFoundError } from '/src/constants'
import { products } from '/src/data'

export async function page(req: Request) {
	const { params } = req
	const product = await products.find(Number(params.id))
	if (!product) throw new NotFoundError(`Product ${params.id} not found`)
	return { product }
}
