export type TopicVersions = Record<string, number>

const versions = new Map<string, number>()

export function routeHash(value: string) {
	let h = 2166136261

	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}

	return (h >>> 0).toString(36)
}

export function normalizeTopics(topic: string | string[]) {
	return [...new Set(Array.isArray(topic) ? topic : [topic])].filter(Boolean).sort()
}

export function bumpTopics(topic: string | string[]) {
	const topics = normalizeTopics(topic)

	for (const t of topics) versions.set(t, (versions.get(t) ?? 0) + 1)

	return topics
}

export function versionsFor(topics: Iterable<string>): TopicVersions {
	const result: TopicVersions = {}

	for (const topic of [...topics].sort()) result[topic] = versions.get(topic) ?? 0

	return result
}

export function parseVersions(raw: string | string[] | undefined): TopicVersions | null {
	if (!raw || Array.isArray(raw)) return null

	try {
		const parsed = JSON.parse(raw) as unknown
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

		const result: TopicVersions = {}

		for (const [topic, version] of Object.entries(parsed)) {
			if (typeof version !== 'number' || !Number.isFinite(version)) return null
			result[topic] = version
		}

		return result
	} catch {
		return null
	}
}

export function isFresh(client: TopicVersions | null) {
	const entries = Object.entries(client ?? {})
	return entries.length > 0 && entries.every(([topic, version]) => (versions.get(topic) ?? 0) === version)
}

export function resetTopicVersions() {
	versions.clear()
}
