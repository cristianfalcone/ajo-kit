import { render as html } from 'ajo/html'

// Types

type Meta =
	| { name: string; content: string }
	| { property: string; content: string }
	| { httpEquiv: string; content: string }

type Link = { rel: string; href: string; [key: string]: string | undefined }

export type Head = {
	title?: string
	description?: string
	canonical?: string
	meta?: Meta[]
	link?: Link[]
}

// Key extractor for deduplication

const key = {
	meta: (entry: Meta) => 'name' in entry ? entry.name : 'property' in entry ? entry.property : null,
	link: (entry: Link) => entry.rel,
}

// Merge: dedupe by key, last wins

export function merge(...heads: (Head | undefined)[]): Head {

	const result: Head = { meta: [], link: [] }
	const index = { meta: new Map<string, number>(), link: new Map<string, number>() }

	for (const head of heads) {

		if (!head) continue

		if (head.title) result.title = head.title
		if (head.description) result.description = head.description
		if (head.canonical) result.canonical = head.canonical

		for (const entry of head.meta ?? []) {

			const id = key.meta(entry)

			if (id && index.meta.has(id)) result.meta![index.meta.get(id)!] = entry
			
			else {
				if (id) index.meta.set(id, result.meta!.length)
				result.meta!.push(entry)
			}
		}

		for (const entry of head.link ?? []) {

			const id = key.link(entry)

			if (index.link.has(id)) result.link![index.link.get(id)!] = entry

			else {
				index.link.set(id, result.link!.length)
				result.link!.push(entry)
			}
		}
	}

	return result
}

// SSR: render to HTML string

export function render(head: Head = {}): string {

	const tags: unknown[] = []

	if (head.title) tags.push(<title>{head.title}</title>)
	if (head.description) tags.push(<meta name="description" content={head.description} />)
	if (head.canonical) tags.push(<link rel="canonical" href={head.canonical} />)

	for (const entry of head.meta ?? []) tags.push(<meta {...entry} />)
	for (const entry of head.link ?? []) tags.push(<link {...entry} />)

	return tags.map(html).join('\n  ')
}

// CSR: update document.head (diff before mutate)

export function apply(head: Head = {}): void {

	if (head.title && document.title !== head.title) document.title = head.title

	const upsert = (selector: string, attrs: Record<string, string>) => {

		let node = document.head.querySelector(selector)

		if (!node) {
			node = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
			for (const [attr, value] of Object.entries(attrs)) node.setAttribute(attr, value)
			document.head.appendChild(node)
			return
		}

		for (const [attr, value] of Object.entries(attrs)) {
			if (node.getAttribute(attr) !== value) node.setAttribute(attr, value)
		}
	}

	if (head.description) upsert('meta[name="description"]', { name: 'description', content: head.description })
	if (head.canonical) upsert('link[rel="canonical"]', { rel: 'canonical', href: head.canonical })

	for (const entry of head.meta ?? []) {
		const id = key.meta(entry)
		const selector = 'name' in entry ? `meta[name="${id}"]` : `meta[property="${id}"]`
		upsert(selector, entry as Record<string, string>)
	}

	for (const entry of head.link ?? []) {
		upsert(`link[rel="${entry.rel}"]`, entry as Record<string, string>)
	}
}
