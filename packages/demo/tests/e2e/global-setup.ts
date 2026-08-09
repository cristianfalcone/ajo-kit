import type { FullConfig } from '@playwright/test'
import { FixtureClient } from './fixture-client'

const wait = async (baseURL: string) => {
	const deadline = Date.now() + 120_000
	let last: unknown

	while (Date.now() < deadline) {
		try {
			const response = await fetch(new URL('/login', baseURL), {
				headers: { Accept: 'text/html' },
				signal: AbortSignal.timeout(2_000),
			})
			if (response.ok) return
			last = new Error(`Server returned ${response.status}`)
		} catch (error) {
			last = error
		}
		await new Promise(resolve => setTimeout(resolve, 250))
	}

	throw new Error(`Timed out waiting for ${baseURL}`, { cause: last })
}

export default async function setup(config: FullConfig) {
	const servers = [...new Set(config.projects.map(project => project.use.baseURL).filter(
		(value): value is string => typeof value === 'string',
	))]
	if (servers.length === 0) throw new Error('No Playwright project baseURLs are configured')

	await Promise.all(servers.map(wait))
	await Promise.all(servers.map(server => new FixtureClient(server).seed()))
}
