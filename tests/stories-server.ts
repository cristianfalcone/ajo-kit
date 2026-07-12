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

		if (options.screenshots) {
			rmSync(directory, { force: true, recursive: true })
			mkdirSync(directory, { recursive: true })
		}

		try {
			for (const story of stories) {
				const target = new URL(`/story/${story.id}?canvas=1${options.screenshots ? '&screenshot=1' : ''}`, url).href
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

						if (options.screenshots) {
							await root.screenshot({
								animations: 'disabled',
								path: join(directory, `${story.id}.png`),
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
					failures.push(`${story.id} (${target})\n${storyErrors.join('\n')}`)
				}
			}
		} finally {
			await browser.close()
		}

		if (failures.length) {
			throw new Error(`Stories smoke failed for ${failures.length} stories:\n\n${failures.join('\n\n')}`)
		}

		console.log(`Stories smoke passed for ${stories.length} stories${match ? ` matching "${options.match}"` : ''}.`)
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
