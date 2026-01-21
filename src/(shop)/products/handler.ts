import { products } from '/src/data'

export async function page() {
	return { products: await products.all(18) }
}
