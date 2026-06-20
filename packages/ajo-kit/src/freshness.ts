export type Versions = Record<string, number>

const versions = new Map<string, number>()

export function hash(value: string) {
	let h = 2166136261

	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}

	return (h >>> 0).toString(36)
}

export function topics(topic: string | string[]) {
	return [...new Set(Array.isArray(topic) ? topic : [topic])].filter(Boolean).sort()
}

export function bump(topic: string | string[]) {
	const list = topics(topic)

	for (const t of list) versions.set(t, (versions.get(t) ?? 0) + 1)

	return list
}

export function snapshot(keys: Iterable<string>): Versions {
	const result: Versions = {}

	for (const topic of [...keys].sort()) result[topic] = versions.get(topic) ?? 0

	return result
}

export function parse(raw: string | string[] | undefined): Versions | null {
	if (!raw || Array.isArray(raw)) return null

	try {
		const parsed = JSON.parse(raw) as unknown
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

		const result: Versions = {}

		for (const [topic, version] of Object.entries(parsed)) {
			if (typeof version !== 'number' || !Number.isFinite(version)) return null
			result[topic] = version
		}

		return result
	} catch {
		return null
	}
}

export function fresh(client: Versions | null) {
	const entries = Object.entries(client ?? {})
	return entries.length > 0 && entries.every(([topic, version]) => (versions.get(topic) ?? 0) === version)
}

export function reset() {
	versions.clear()
}
