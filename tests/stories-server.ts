import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import sade from 'sade'
import type { Plugin, ViteDevServer } from 'vite'

type Options = {
	'update-snapshots'?: boolean
	browser?: string
	compare: boolean
	cycles?: number | string
	match?: string
	port: number
	screenshots: boolean
	updateSnapshots: boolean
}

type BrowserName = 'chromium' | 'firefox' | 'webkit'

type StorySummary = {
	id: string
	name: string
	parameters?: {
		empty?: boolean
		viewport?: {
			height: number
			width: number
		}
	}
	title: string
}

type LifecycleMetrics = {
	intersectionTargets: number
	listeners: number
	openPopovers: number
	peakIntersectionTargets: number
	peakListeners: number
	peakResizeTargets: number
	resizeTargets: number
}

type LifecycleProbe = {
	resetPeaks: () => void
	snapshot: () => LifecycleMetrics
}

const host = '127.0.0.1'
const html = resolve('tests/stories/index.html')
const navigationTimeout = 60_000
const readyTimeout = 30_000
const browsers: BrowserName[] = ['chromium', 'firefox', 'webkit']
const transient = (errors: string[]) =>
	errors.some(error => error.includes('net::ERR_NETWORK_CHANGED'))
const errorText = (error: Error) => error.stack?.includes(error.message)
	? error.stack
	: `${error.message}${error.stack ? `\n${error.stack}` : ''}`

const browserName = (value = 'chromium'): BrowserName => {
	if (browsers.includes(value as BrowserName)) return value as BrowserName
	throw new Error(`Unknown browser "${value}". Expected ${browsers.join(', ')}.`)
}

const launch = async (name: BrowserName) => (await import('playwright'))[name].launch({ headless: true })

const lifecycleProbe = String.raw`
{
	const scope = globalThis
	const listeners = []
	const counts = { intersectionTargets: 0, resizeTargets: 0 }
	const peaks = { intersectionTargets: 0, listeners: 0, resizeTargets: 0 }
	const tracked = new Set(['resize', 'scroll'])
	const capture = options => typeof options === 'boolean' ? options : Boolean(options && options.capture)
	const peak = () => {
		peaks.intersectionTargets = Math.max(peaks.intersectionTargets, counts.intersectionTargets)
		peaks.listeners = Math.max(peaks.listeners, listeners.length)
		peaks.resizeTargets = Math.max(peaks.resizeTargets, counts.resizeTargets)
	}

	const add = EventTarget.prototype.addEventListener
	const remove = EventTarget.prototype.removeEventListener
	EventTarget.prototype.addEventListener = function(type, listener, options) {
		const result = Reflect.apply(add, this, arguments)
		if (listener && tracked.has(type)) {
			const value = capture(options)
			if (!listeners.some(item => item.target === this && item.type === type && item.listener === listener && item.capture === value)) {
				listeners.push({ capture: value, listener, target: this, type })
				peak()
			}
		}
		return result
	}
	EventTarget.prototype.removeEventListener = function(type, listener, options) {
		const result = Reflect.apply(remove, this, arguments)
		if (listener && tracked.has(type)) {
			const value = capture(options)
			const index = listeners.findIndex(item => item.target === this && item.type === type && item.listener === listener && item.capture === value)
			if (index >= 0) listeners.splice(index, 1)
		}
		return result
	}

	const wrap = (Native, key) => class {
		constructor(callback, options) {
			this.targets = new Set()
			this.observer = new Native(entries => callback(entries, this), options)
		}
		get root() { return this.observer.root }
		get rootMargin() { return this.observer.rootMargin }
		get thresholds() { return this.observer.thresholds }
		disconnect() {
			this.observer.disconnect()
			counts[key] -= this.targets.size
			this.targets.clear()
		}
		observe(target, options) {
			this.observer.observe(target, options)
			if (!this.targets.has(target)) {
				this.targets.add(target)
				counts[key]++
				peak()
			}
		}
		takeRecords() { return this.observer.takeRecords ? this.observer.takeRecords() : [] }
		unobserve(target) {
			this.observer.unobserve(target)
			if (this.targets.delete(target)) counts[key]--
		}
	}

	globalThis.ResizeObserver = wrap(globalThis.ResizeObserver, 'resizeTargets')
	globalThis.IntersectionObserver = wrap(globalThis.IntersectionObserver, 'intersectionTargets')
	const snapshot = () => ({
		intersectionTargets: counts.intersectionTargets,
		listeners: listeners.length,
		openPopovers: document.querySelectorAll('[popover]:popover-open').length,
		peakIntersectionTargets: peaks.intersectionTargets,
		peakListeners: peaks.listeners,
		peakResizeTargets: peaks.resizeTargets,
		resizeTargets: counts.resizeTargets,
	})
	scope.__AJO_POPOVER_LIFECYCLE__ = {
		resetPeaks() {
			peaks.intersectionTargets = counts.intersectionTargets
			peaks.listeners = listeners.length
			peaks.resizeTargets = counts.resizeTargets
		},
		snapshot,
	}
}
`

async function popoverLifecycle(page: import('playwright').Page, cycles: number) {
	const trigger = page.locator('#arrow-popover-trigger')
	const content = page.locator('[data-test="arrow-popover-content"]')
	await trigger.waitFor({ timeout: readyTimeout })
	await content.waitFor({ state: 'attached', timeout: readyTimeout })

	const opened = () => page.evaluate(() =>
		document.querySelector('[data-test="arrow-popover-content"]')?.matches(':popover-open') ?? false
	)
	if (await opened()) {
		await trigger.click()
		await page.waitForFunction(() =>
			!document.querySelector('[data-test="arrow-popover-content"]')?.matches(':popover-open')
		)
	}

	await page.evaluate(() => new Promise<void>(resolve =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	))
	const baseline = await page.evaluate(() => {
		const probe = (globalThis as typeof globalThis & {
			__AJO_POPOVER_LIFECYCLE__?: LifecycleProbe
		}).__AJO_POPOVER_LIFECYCLE__
		if (!probe) throw new Error('Popover lifecycle probe was not installed')
		probe.resetPeaks()
		return probe.snapshot()
	})

	for (let cycle = 1; cycle <= cycles; cycle++) {
		await trigger.click()
		await page.waitForFunction(() =>
			document.querySelector('[data-test="arrow-popover-content"]')?.matches(':popover-open'),
			undefined,
			{ timeout: 5_000 },
		)
		const geometry = await content.evaluate(element => ({
			left: element.style.left,
			placement: element.dataset.placement,
			position: element.style.position,
			top: element.style.top,
			visibility: getComputedStyle(element).visibility,
		}))
		if (!geometry.placement || geometry.position !== 'fixed' || geometry.visibility !== 'visible' ||
			!Number.isFinite(Number.parseFloat(geometry.left)) || !Number.isFinite(Number.parseFloat(geometry.top))) {
			throw new Error(`Popover cycle ${cycle} did not commit real geometry: ${JSON.stringify(geometry)}`)
		}

		await trigger.click()
		await page.waitForFunction(() =>
			!document.querySelector('[data-test="arrow-popover-content"]')?.matches(':popover-open'),
			undefined,
			{ timeout: 5_000 },
		)
	}

	await page.evaluate(() => new Promise<void>(resolve =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	))
	const final = await page.evaluate(() => {
		const probe = (globalThis as typeof globalThis & {
			__AJO_POPOVER_LIFECYCLE__?: LifecycleProbe
		}).__AJO_POPOVER_LIFECYCLE__
		if (!probe) throw new Error('Popover lifecycle probe disappeared')
		return probe.snapshot()
	})

	const retained = final.listeners !== baseline.listeners ||
		final.resizeTargets !== baseline.resizeTargets ||
		final.intersectionTargets !== baseline.intersectionTargets
	if (retained || final.openPopovers !== 0) {
		throw new Error(`Popover lifecycle did not return to baseline after ${cycles} cycles:\n` +
			`baseline=${JSON.stringify(baseline)}\nfinal=${JSON.stringify(final)}`)
	}
	if (final.peakListeners <= baseline.listeners ||
		final.peakResizeTargets <= baseline.resizeTargets ||
		final.peakIntersectionTargets <= baseline.intersectionTargets) {
		throw new Error(`Popover lifecycle probe did not observe real Floating UI resources:\n` +
			`baseline=${JSON.stringify(baseline)}\nfinal=${JSON.stringify(final)}`)
	}

	return { baseline, final }
}

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
	const resolvedPort = Number(port)
	if (!Number.isSafeInteger(resolvedPort) || resolvedPort < 0 || resolvedPort > 65_535) {
		throw new Error(`Invalid port: ${port}`)
	}
	const vite = await import('vite')
	const server = await vite.createServer({
		appType: 'custom',
		configFile: resolve('vite.config.ts'),
		plugins: [stories()],
		server: {
			host,
			port: resolvedPort || undefined,
			strictPort: resolvedPort > 0,
			hmr: { host, protocol: 'ws' },
		},
	})

	await server.listen()
	const address = server.httpServer?.address()
	const actualPort = typeof address === 'object' && address ? address.port : resolvedPort

	return {
		server,
		url: server.resolvedUrls?.local[0] ?? `http://${host}:${actualPort}/`,
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

async function index(url: string, name: BrowserName) {
	const browser = await launch(name)

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
	page.on('pageerror', error => errors.push(errorText(error)))
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
	const name = browserName(options.browser)
	const cycles = Number(options.cycles ?? 0)
	const updateSnapshots = Boolean(options.updateSnapshots || options['update-snapshots'])
	const visual = options.screenshots || options.compare || updateSnapshots
	if (!Number.isSafeInteger(cycles) || cycles < 0) throw new Error('--cycles must be a non-negative integer.')
	if (options.compare && updateSnapshots) throw new Error('--compare and --update-snapshots are mutually exclusive.')
	if (cycles && visual) throw new Error('--cycles and visual screenshot options must run as separate gates.')
	const { server, url } = await serve(options.port)

	try {
		const discovered = await index(url, name)
		const match = options.match?.trim().toLowerCase()
		const stories = match
			? discovered.filter(story =>
				story.id.toLowerCase().includes(match) ||
				story.name.toLowerCase().includes(match) ||
				story.title.toLowerCase().includes(match)
			)
			: discovered

		if (!stories.length) throw new Error('No stories found.')

		const browser = await launch(name)
		const failures: string[] = []
		const directory = resolve('.tmp/stories-screenshots', name)
		const baselineDirectory = resolve('tests/stories-visual', process.platform, name)
		const themes: Array<'dark' | 'light' | undefined> = visual
			? ['light', 'dark']
			: [undefined]

		if (visual) {
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
					if (visual) parameters.set('screenshot', '1')
					if (theme) parameters.set('theme', theme)
					const target = new URL(`/story/${story.id}?${parameters}`, url).href
					let storyErrors: string[] = []

					for (let attempt = 0; attempt < 2; attempt++) {
						const page = await browser.newPage({
							viewport: story.parameters?.viewport ?? { width: 1280, height: 900 },
						})
						const errors: string[] = []
						if (cycles) await page.addInitScript({ content: lifecycleProbe })

						page.on('pageerror', error => errors.push(errorText(error)))
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

							if (cycles) {
								const result = await popoverLifecycle(page, cycles)
								console.log(`Popover lifecycle passed ${cycles} cycles: ${JSON.stringify(result)}`)
							}

							if (visual && theme) {
								const path = join(directory, theme, `${story.id}.png`)
								const screenshot = await root.screenshot({
									animations: 'disabled',
									path,
								})
								const baseline = join(baselineDirectory, theme, `${story.id}.png`)
								if (updateSnapshots) {
									mkdirSync(join(baselineDirectory, theme), { recursive: true })
									writeFileSync(baseline, screenshot)
								} else if (options.compare) {
									if (!existsSync(baseline)) {
										throw new Error(`Visual baseline is missing: ${baseline}`)
									}
									if (!screenshot.equals(readFileSync(baseline))) {
										throw new Error(`Visual baseline mismatch for ${story.id} [${name}/${theme}]. Actual: ${path}`)
									}
								}
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
		console.log(`Stories smoke passed in ${name} for ${stories.length} stories${visual ? ' in light and dark' : ''}${match ? ` matching "${options.match}"` : ''}.`)
		if (visual) console.log(`Screenshots written to ${directory}`)
		if (options.compare) console.log(`Visual baselines matched ${baselineDirectory}`)
		if (updateSnapshots) console.log(`Visual baselines updated in ${baselineDirectory}`)
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
	.option('-b, --browser', 'Playwright browser: chromium, firefox, or webkit', 'chromium')
	.option('--compare', 'Compare screenshots byte-for-byte with committed visual baselines')
	.option('--cycles', 'Run real Popover open/close lifecycle cycles', 0)
	.option('-m, --match', 'Only run stories whose title, name, or id contains this text')
	.option('-p, --port', 'Port number', 5182)
	.option('--screenshots', 'Write screenshots to .tmp/stories-screenshots')
	.option('--update-snapshots', 'Replace committed visual baselines with current screenshots')
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
