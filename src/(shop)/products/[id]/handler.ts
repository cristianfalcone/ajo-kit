import type { Request } from 'polka'
import { NotFoundError } from '/src/constants'
import { products } from '/src/data'
import { v, parse, numeric } from '/src/schemas'

export async function page(req: Request) {
	const { id } = parse(v.object({ id: numeric }), req.params)
	const product = await products.find(id)
	if (!product) throw new NotFoundError(`Product ${id} not found`)
	return { product }
}
