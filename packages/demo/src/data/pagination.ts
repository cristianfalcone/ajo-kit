import type { Request } from '@kit'

export type Pagination = {
	page: number
	size: number
	offset: number
}

export type Info = {
	page: number
	size: number
	back: boolean
	more: boolean
	prev?: string
	next?: string
}

const num = (value: string | null, fallback: number) => {
	const number = Number(value)
	return Number.isInteger(number) && number > 0 ? number : fallback
}

const href = (url: URL, page: number) => {
	const next = new URL(url)

	if (page <= 1) next.searchParams.delete('page')
	else next.searchParams.set('page', String(page))

	return `${next.pathname}${next.search}`
}

export function paginate(req: Pick<Request, 'originalUrl'>, fallback = 25, max = 100): Pagination {
	const url = new URL(req.originalUrl, 'http://ajo.local')
	const size = Math.min(num(url.searchParams.get('size'), fallback), max)
	const page = num(url.searchParams.get('page'), 1)

	return {
		page,
		size,
		offset: (page - 1) * size,
	}
}

export function info<T>(req: Pick<Request, 'originalUrl'>, page: Pagination, data: T[]): Info {
	const url = new URL(req.originalUrl, 'http://ajo.local')
	const back = page.page > 1
	const more = data.length > page.size

	return {
		page: page.page,
		size: page.size,
		back,
		more,
		...(back && { prev: href(url, page.page - 1) }),
		...(more && { next: href(url, page.page + 1) }),
	}
}

export const rows = <T>(page: Pagination, data: T[]) => data.slice(0, page.size)