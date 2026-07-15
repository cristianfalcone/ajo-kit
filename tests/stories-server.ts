import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import sade from 'sade'
import type { Plugin, ViteDevServer } from 'vite'

type Options = {
	match?: string
	port: number
	screenshots: boolean
}

type StorySummary = {
	id: string
	name: string
	parameters?: {
		empty?: boolean
	}
	title: string
}

const host = '127.0.0.1'
const html = resolve('tests/stories/index.html')
const navigationTimeout = 60_000
const readyTimeout = 30_000
const transient = (errors: string[]) =>
	errors.some(error => error.includes('net::ERR_NETWORK_CHANGED'))

function stories(): Plugin {
	return {
		name: 'ajo-stories',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const method = req.method ?? 'GET'
				const url = new URL(req.url ?? '/', 'http://ajo-stories.local')

				if (method !== 'GET' || (url.pathname !== '/' && !url.pathname.startsWith('/story/'))) {
					next()
					return
				}

				try {
					const source = readFileSync(html, 'utf8')
					const body = await server.transformIndexHtml(url.pathname, source)
					res.statusCode = 200
					res.setHeader('Content-Type', 'text/html; charset=utf-8')
					res.end(body)
				} catch (error) {
					server.ssrFixStacktrace(error as Error)
					next(error)
				}
			})
		},
	}
}

async function serve(port: number) {
	const vite = await import('vite')
	const server = await vite.createServer({
		appType: 'custom',
		configFile: resolve('vite.config.ts'),
		plugins: [stories()],
		server: {
			host,
			port,
			strictPort: true,
			hmr: { host, protocol: 'ws' },
		},
	})

	await server.listen()

	return {
		server,
		url: server.resolvedUrls?.local[0] ?? `http://${host}:${port}/`,
	}
}

async function dev(options: Options) {
	const { server, url } = await serve(options.port)

	console.log(`Ajo UI Stories started at ${url}`)

	const close = async () => {
		await server.close()
		process.exit(0)
	}

	process.once('SIGINT', close)
	process.once('SIGTERM', close)

	await new Promise(() => {})
}

async function index(url: string) {
	const { chromium } = await import('playwright')
	const browser = await chromium.launch({ headless: true })

	try {
		const page = await browser.newPage()
		await page.goto(url, { timeout: navigationTimeout, waitUntil: 'domcontentloaded' })
		await page.locator('html[data-ajo-ready="true"]').waitFor({ timeout: readyTimeout })
		const stories = await page.evaluate(() => (globalThis as {
			__AJO_STORIES_INDEX__?: StorySummary[]
		}).__AJO_STORIES_INDEX__ ?? [])
		const theme = page.locator('button[aria-label="Change theme"]')
		await theme.click()
		await page.locator('html[data-ajo-ready="true"]:not(.dark)').waitFor({ timeout: 5_000 })
		await theme.click()
		await page.locator('html[data-ajo-ready="true"].dark').waitFor({ timeout: 5_000 })
		await page.close()
		return stories
	} finally {
		await browser.close()
	}
}

async function waitForChecked(locator: import('playwright').Locator, expected: boolean) {
	for (let attempt = 0; attempt < 40; attempt++) {
		if (await locator.isChecked() === expected) return
		await new Promise(resolve => setTimeout(resolve, 50))
	}

	throw new Error(`Story frame checkbox did not become ${expected ? 'checked' : 'unchecked'}.`)
}

async function managerSmoke(
	browser: import('playwright').Browser,
	url: string,
	stories: StorySummary[],
) {
	const controlled = stories.find(story => story.title === 'UI/Checkbox' && story.name === 'With Label')
	const destination = stories.find(story => story.title === 'UI/Button' && story.id !== controlled?.id)
	if (!controlled || !destination) throw new Error('Manager smoke requires Checkbox / With Label and one Button story.')

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
	const errors: string[] = []
	page.on('pageerror', error => errors.push(error.stack ?? error.message))
	page.on('console', message => {
		if (message.type() === 'error') errors.push(message.text())
	})

	try {
		await page.goto(new URL(`/story/${controlled.id}`, url).href, {
			timeout: navigationTimeout,
			waitUntil: 'domcontentloaded',
		})
		await page.locator('html[data-ajo-ready="true"]').waitFor({ timeout: readyTimeout })
		await page.locator('[data-stories-layout="true"]').waitFor({ timeout: readyTimeout })

		const frameSelector = `[data-story-frame="${controlled.id}"]`
		const frame = page.frameLocator(frameSelector)
		const frameInput = frame.locator('[data-slot="checkbox-input"]')
		await frame.locator('html[data-ajo-ready="true"]').waitFor({ timeout: readyTimeout })
		await frame.locator(`[data-story-root="${controlled.id}"]`).waitFor({ timeout: readyTimeout })
		await waitForChecked(frameInput, false)

		await page.locator('#arg-checked').click()
		await page.locator('[data-stories-args="true"] pre').filter({ hasText: '"checked": true' }).waitFor({ timeout: readyTimeout })
		await waitForChecked(frameInput, true)

		await page.locator('[data-stories-reset="true"]').click()
		await page.locator('[data-stories-args="true"] pre').filter({ hasText: '"checked": false' }).waitFor({ timeout: readyTimeout })
		await waitForChecked(frameInput, false)

		const search = page.getByLabel('Search stories')
		await search.fill(destination.id)
		await page.waitForURL(current => current.searchParams.get('search') === destination.id, { timeout: readyTimeout })
		await page.locator(`[data-story-link="${destination.id}"]`).click()
		await page.waitForURL(current => current.pathname === `/story/${destination.id}`, { timeout: readyTimeout })
		await page.locator(`[data-story-frame="${destination.id}"]`).waitFor({ timeout: readyTimeout })
		await page.frameLocator(`[data-story-frame="${destination.id}"]`)
			.locator('html[data-ajo-ready="true"]')
			.waitFor({ timeout: readyTimeout })

		if (errors.length) throw new Error(`Manager smoke reported browser errors:\n${errors.join('\n')}`)
	} finally {
		await page.close()
	}
}

async function test(options: Options) {
	const { chromium } = await import('playwright')
	const { server, url } = await serve(options.port)

	try {
		const discovered = await index(url)
		const match = options.match?.trim().toLowerCase()
		const stories = match
			? discovered.filter(story =>
				story.id.toLowerCase().includes(match) ||
				story.name.toLowerCase().includes(match) ||
				story.title.toLowerCase().includes(match)
			)
			: discovered

		if (!stories.length) throw new Error('No stories found.')

		const browser = await chromium.launch({ headless: true })
		const failures: string[] = []
		const directory = resolve('.tmp/stories-screenshots')
		const themes: Array<'dark' | 'light' | undefined> = options.screenshots
			? ['light', 'dark']
			: [undefined]

		if (options.screenshots) {
			rmSync(directory, { force: true, recursive: true })
			for (const theme of themes) {
				if (theme) mkdirSync(join(directory, theme), { recursive: true })
			}
		}

		try {
			await managerSmoke(browser, url, discovered)

			for (const story of stories) {
				await Promise.all(themes.map(async theme => {
					const parameters = new URLSearchParams({ canvas: '1' })
					if (options.screenshots) parameters.set('screenshot', '1')
					if (theme) parameters.set('theme', theme)
					const target = new URL(`/story/${story.id}?${parameters}`, url).href
					let storyErrors: string[] = []

					for (let attempt = 0; attempt < 2; attempt++) {
						const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
						const errors: string[] = []

						page.on('pageerror', error => errors.push(error.stack ?? error.message))
						page.on('console', message => {
							if (message.type() === 'error') errors.push(message.text())
						})

						try {
							await page.goto(target, { timeout: navigationTimeout, waitUntil: 'domcontentloaded' })
							await page.locator('html[data-ajo-ready="true"]').waitFor({ timeout: readyTimeout })

							const issue = await page.locator('[data-stories-error]').first().textContent({ timeout: 250 }).catch(() => null)
							if (issue) errors.push(issue.trim())

							const root = page.locator('[data-story-root]').first()
							await root.waitFor({ timeout: 5_000 })
							const box = await root.boundingBox()

							if (!box || box.width <= 0 || box.height <= 0) {
								if (!story.parameters?.empty) errors.push('Story root has no visible bounding box.')
							}

							if (options.screenshots && theme) {
								await root.screenshot({
									animations: 'disabled',
									path: join(directory, theme, `${story.id}.png`),
								})
							}
						} catch (error) {
							errors.push(error instanceof Error ? error.stack ?? error.message : String(error))
						} finally {
							await page.close()
						}

						storyErrors = errors
						if (!storyErrors.length || !transient(storyErrors)) break
					}

					if (storyErrors.length) {
						failures.push(`${story.id}${theme ? ` [${theme}]` : ''} (${target})\n${storyErrors.join('\n')}`)
					}
				}))
			}
		} finally {
			await browser.close()
		}

		if (failures.length) {
			throw new Error(`Stories smoke failed for ${failures.length} stories:\n\n${failures.join('\n\n')}`)
		}

		console.log('Stories manager smoke passed.')
		console.log(`Stories smoke passed for ${stories.length} stories${options.screenshots ? ' in light and dark' : ''}${match ? ` matching "${options.match}"` : ''}.`)
		if (options.screenshots) console.log(`Screenshots written to ${directory}`)
	} finally {
		await close(server)
	}
}

async function close(server: ViteDevServer) {
	await server.close()
}

const cli = sade('stories')

cli.command('dev', 'Start the Ajo UI stories harness', { default: true })
	.option('-p, --port', 'Port number', 5182)
	.action(async (options: Options) => {
		await dev(options)
	})

cli.command('test', 'Run the stories smoke suite')
	.option('-m, --match', 'Only run stories whose title, name, or id contains this text')
	.option('-p, --port', 'Port number', 5182)
	.option('--screenshots', 'Write screenshots to .tmp/stories-screenshots')
	.action(async (options: Options) => {
		await test(options)
	})

const output = cli.parse(process.argv, { lazy: true })
if (!output) process.exit(0)

try {
	await output.handler(...output.args)
} catch (error) {
	console.error(error instanceof Error ? error.stack ?? error.message : error)
	process.exit(1)
}
