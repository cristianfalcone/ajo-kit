// Types

type Meta =
	| { name: string; content: string }
	| { property: string; content: string }
	| { httpEquiv: string; content: string }

type Link = { rel: string; href: string; [key: string]: string | undefined }

/** Document head fields route modules can return from head(). */
export type Head = {
	title?: string
	meta?: Meta[]
	link?: Link[]
}

// Key extractor for deduplication

const key = {
	meta: (entry: Meta) => 'name' in entry ? entry.name : 'property' in entry ? entry.property : entry.httpEquiv,
	link: (entry: Link) => entry.rel,
}

const append = <T,>(items: T[], index: Map<string, number>, entry: T, id: string) => {
	const position = index.get(id)

	if (position === undefined) {
		index.set(id, items.length)
		items.push(entry)
		return
	}

	items[position] = entry
}

// Merge: dedupe by key, last wins

/** Merges route heads, letting later meta/link entries win by key. */
export function merge(...heads: (Head | undefined)[]): Head {

	const result: Head = {}
	const meta: Meta[] = []
	const link: Link[] = []
	const index = { meta: new Map<string, number>(), link: new Map<string, number>() }

	for (const head of heads) {

		if (!head) continue

		if (head.title) result.title = head.title

		for (const entry of head.meta ?? []) append(meta, index.meta, entry, key.meta(entry))
		for (const entry of head.link ?? []) append(link, index.link, entry, key.link(entry))
	}

	if (meta.length) result.meta = meta
	if (link.length) result.link = link

	return result
}

// SSR: render to HTML string

const text = (value: string) => value
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')

const attribute = (value: string) => text(value).replace(/"/g, '&quot;')

const attrs = (entries: Record<string, string | undefined>) =>
	Object.entries(entries)
		.filter((entry): entry is [string, string] => entry[1] !== undefined)
		.map(([name, value]) => `${name}="${attribute(value)}"`)
		.join(' ')

const tag = (name: 'meta' | 'link', entries: Record<string, string | undefined>) =>
	`<${name} ${attrs(entries)}>`

/** Renders a Head object into SSR-safe HTML tags. */
export function render(head: Head = {}): string {

	const tags: string[] = []

	if (head.title) tags.push(`<title>${text(head.title)}</title>`)

	for (const entry of head.meta ?? []) tags.push(tag('meta', entry))
	for (const entry of head.link ?? []) tags.push(tag('link', entry))

	return tags.join('\n  ')
}

// CSR: update document.head (diff before mutate)

/** Applies a Head object to document.head during client navigation. */
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

	for (const entry of head.meta ?? []) {
		const id = key.meta(entry)
		const selector = 'name' in entry ? `meta[name="${id}"]` : 'property' in entry ? `meta[property="${id}"]` : `meta[http-equiv="${id}"]`
		upsert(selector, entry as Record<string, string>)
	}

	for (const entry of head.link ?? []) {
		upsert(`link[rel="${entry.rel}"]`, entry as Record<string, string>)
	}
}
