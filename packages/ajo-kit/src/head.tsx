import { render } from 'ajo'

type Meta =
	| { name: string; content: string }
	| { property: string; content: string }

type Link = { rel: string; href: string; [key: string]: string | undefined }

/** Document head fields route modules can return from head(). */
export type Head = {
	title?: string
	meta?: Meta[]
	link?: Link[]
}

/** Merges route heads; a later meta (by name or property) or link (by rel) replaces an earlier one in place. */
export function merge(...heads: (Head | undefined)[]): Head {

	const result: Head = {}
	const meta = new Map<string, Meta>()
	const link = new Map<string, Link>()

	for (const head of heads) {

		if (!head) continue

		if (head.title) result.title = head.title

		for (const entry of head.meta ?? []) meta.set('name' in entry ? entry.name : entry.property, entry)
		for (const entry of head.link ?? []) link.set(entry.rel, entry)
	}

	if (meta.size) result.meta = [...meta.values()]
	if (link.size) result.link = [...link.values()]

	return result
}

// A route's head tags live between these two comments. The server renders
// them there and the client replaces only that range, so template tags
// (viewport, icons, stylesheets, a template title) are never touched. The
// first title in the document names it: a template title placed after the
// range is the fallback for routes without one.
const start = 'ajo:head'
const end = '/ajo:head'

/** The route's head tags; the server renders them with ajo/html into range(), the client with apply(). */
export const view = (head: Head) => [
	head.title ? <title>{head.title}</title> : null,
	head.meta?.map(entry => <meta {...entry} />),
	head.link?.map(entry => <link {...entry} />),
]

/** Wraps rendered head tags in the managed range. */
export const range = (tags: string) => `<!--${start}-->${tags}<!--${end}-->`

const marker = (data: string) =>
	[...document.head.childNodes].find(node => node instanceof Comment && node.data === data)

/** Replaces the managed head range during client navigation. */
export function apply(head: Head): void {

	const first = marker(start)
	const last = marker(end)
	if (!first || !last) return

	// Empty the range, then render at its end: Ajo's search for a reusable
	// element walks element siblings, so it would pass a comment bound.
	while (first.nextSibling !== last) first.nextSibling!.remove()
	render(view(head), document.head, last, last)
}
