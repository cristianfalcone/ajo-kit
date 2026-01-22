import type { Request } from 'polka'
import { NotFoundError } from '/src/constants'
import { object } from 'valibot'
import { products, parse, numeric } from '/src/data'

export async function page(req: Request) {
	const { id } = parse(object({ id: numeric }), req.params)
	const product = await products.find(id)
	if (!product) throw new NotFoundError(`Product ${id} not found`)
	return { product }
}
