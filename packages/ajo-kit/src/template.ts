const markers = /<!--\s*ssr:([A-Za-z0-9_]+)\s*-->/g

/** Compiles HTML containing ssr:* comments into a slot renderer. */
export function compile(html: string) {
	const parts = html.split(markers)
	return (slots: Record<string, string>) =>
		parts.map((part, index) => index % 2 ? slots[part] ?? '' : part).join('')
}
