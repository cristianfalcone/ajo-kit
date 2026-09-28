import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sade from 'sade'
import type { Page } from 'playwright'
import type { Plugin } from 'vite'
import type { Check, Known, Layer } from './app'

type Options = {
	accept?: boolean | string
	browser?: string
	cycles?: number | string
	match?: string
	port: number
	screens: boolean
	screenshots: boolean
}

type BrowserName = 'chromium' | 'firefox' | 'webkit'

type StorySummary = {
	id: string
	name: string
	parameters?: {
		empty?: boolean
		known?: Known[]
		layers?: Record<string, Layer>
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
const root = dirname(fileURLToPath(import.meta.url))
const workspace = join(root, '../../..')
const html = join(root, 'index.html')
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
	const vite = await import('vite')
	const server = await vite.createServer({
		appType: 'custom',
		configFile: join(root, 'vite.config.ts'),
		plugins: [stories()],
		root,
		server: {
			host,
			port: port || undefined,
			strictPort: port > 0,
			hmr: { host, protocol: 'ws' },
		},
	})

	await server.listen()
	const address = server.httpServer?.address()
	const actualPort = typeof address === 'object' && address ? address.port : port

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
		// System, light, dark, system: back on system the class follows the preference again.
		const theme = page.locator('button[aria-label="Change theme"]')
		await theme.click()
		await page.locator('html[data-ajo-ready="true"].light:not(.dark)').waitFor({ timeout: 5_000 })
		await theme.click()
		await page.locator('html[data-ajo-ready="true"].dark:not(.light)').waitFor({ timeout: 5_000 })
		await theme.click()
		await page.emulateMedia({ colorScheme: 'light' })
		await page.locator('html[data-ajo-ready="true"].light:not(.dark)').waitFor({ timeout: 5_000 })
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.locator('html[data-ajo-ready="true"].dark:not(.light)').waitFor({ timeout: 5_000 })
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

		await page.goto(new URL('/story/ui-missing--story?canvas=1', url).href, {
			timeout: navigationTimeout,
			waitUntil: 'domcontentloaded',
		})
		await page.locator('html[data-ajo-ready="true"]').waitFor({ timeout: readyTimeout })
		const missing = await page.locator('[data-stories-error]').textContent()
		if (missing?.trim() !== 'Unknown story "ui-missing--story".' || await page.locator('[data-story-root]').count()) {
			throw new Error(`An unknown story id did not show its error: ${missing}`)
		}

		if (errors.length) throw new Error(`Manager smoke reported browser errors:\n${errors.join('\n')}`)
	} finally {
		await page.close()
	}
}

async function test(options: Options) {
	const name = browserName(options.browser)
	const cycles = Number(options.cycles ?? 0)
	const visual = options.screenshots
	if (!Number.isSafeInteger(cycles) || cycles < 0) throw new Error('--cycles must be a non-negative integer.')
	if (cycles && visual) throw new Error('--cycles and --screenshots must run as separate gates.')
	const { server, url } = await serve(options.port)

	try {
		const discovered = await index(url, name)
		// Screens/* run under --screens, which knows the failures a screen has today.
		const families = discovered.filter(story => !story.title.startsWith('Screens/'))
		const match = options.match?.trim().toLowerCase()
		const stories = match
			? families.filter(story =>
				story.id.toLowerCase().includes(match) ||
				story.name.toLowerCase().includes(match) ||
				story.title.toLowerCase().includes(match)
			)
			: families

		if (!stories.length) throw new Error('No stories found.')

		const browser = await launch(name)
		const failures: string[] = []
		const directory = join(workspace, '.tmp/stories-screenshots', name)
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
		console.log(`Stories smoke passed in ${name} for ${stories.length} stories${visual ? ' in light and dark' : ''}${match ? ` matching "${options.match}"` : ''}.`)
		if (visual) console.log(`Screenshots written to ${directory}`)
	} finally {
		await server.close()
	}
}

type Variant = {
	dir: 'ltr' | 'rtl'
	name: string
	theme: 'dark' | 'light'
	width: number
}

type Failure = {
	check: Check | 'play'
	id: string
	message: string
	variant: string
}

type Capture = {
	file: string
	id: string
}

type Summary = {
	browser: BrowserName
	captures: Capture[]
	known: Failure[]
	passed: boolean
	real: Failure[]
}

type Play = typeof import('./play')

const variants: Variant[] = [
	{ dir: 'ltr', name: 'light-1280', theme: 'light', width: 1280 },
	{ dir: 'ltr', name: 'dark-1280', theme: 'dark', width: 1280 },
	{ dir: 'ltr', name: 'light-390', theme: 'light', width: 390 },
	{ dir: 'ltr', name: 'dark-390', theme: 'dark', width: 390 },
	{ dir: 'rtl', name: 'rtl-light-1280', theme: 'light', width: 1280 },
]
const runs = join(workspace, '.tmp/screens')
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
/** D30: reviewed references for `Screens/*`, one directory per platform and browser. */
const references = (name: BrowserName) => join(root, 'visual', `${process.platform}-${name}`)

/** Runs `run` in the page with the stories' play module and the story root. */
const play = <T>(page: Page, run: (play: Play, root: HTMLElement) => T | Promise<T>): Promise<T> =>
	page.evaluate(`import('/play.ts').then(play => (${run})(play, document.querySelector('[data-story-root]')))`)

/** Runs a check like `play`; returns its failure, one message per line, or none. */
const assert = (page: Page, run: (play: Play, root: HTMLElement) => unknown): Promise<string[]> =>
	page.evaluate(`import('/play.ts').then(play => (${run})(play, document.querySelector('[data-story-root]')))
		.then(() => [], error => String(error instanceof Error ? error.message : error).split('\\n'))`)

/**
 * Opens a screen in one variant and waits for its own play; `still` removes
 * animations for captures. A play failure of a named check comes back in
 * `checks`, so the variant's other checks still run; any other goes to `errors`.
 */
async function visit(
	browser: import('playwright').Browser,
	url: string,
	story: StorySummary,
	variant: Variant,
	options: { forcedColors?: 'active'; reducedMotion?: 'reduce'; still?: boolean } = {},
) {
	const { still = true, ...media } = options
	const parameters = new URLSearchParams({ canvas: '1', theme: variant.theme })
	if (still) parameters.set('screenshot', '1')
	if (variant.dir === 'rtl') parameters.set('dir', 'rtl')
	const page = await browser.newPage({
		deviceScaleFactor: 1,
		locale: 'en-US',
		viewport: { width: variant.width, height: 900 },
		...media,
	})
	const errors: string[] = []
	const checks: Array<{ check: Check; lines: string[] }> = []
	page.on('pageerror', error => errors.push(errorText(error)))
	page.on('console', message => {
		if (message.type() === 'error') errors.push(message.text())
	})

	try {
		await page.goto(new URL(`/story/${story.id}?${parameters}`, url).href, { timeout: navigationTimeout, waitUntil: 'domcontentloaded' })
		await page.locator('html[data-ajo-ready="true"]').waitFor({ timeout: readyTimeout })
		const issues = await page.locator('[data-stories-error]').evaluateAll(elements => elements.map(element => ({
			check: (element as HTMLElement).dataset.storiesErrorCheck,
			text: element.textContent?.trim() ?? '',
		})))
		for (const { check, text } of issues) {
			if (check) checks.push({ check: check as Check, lines: text.split('\n') })
			else errors.push(text)
		}
		const dir = await page.evaluate(() => document.documentElement.dir)
		if (dir !== variant.dir) errors.push(`The page renders ${dir || 'ltr'}, not ${variant.dir}.`)
		if (!errors.length) {
			await page.locator('[data-story-root]').first().waitFor({ timeout: 5_000 })
			await page.evaluate(() => document.fonts.ready)
		}
	} catch (error) {
		errors.push(error instanceof Error ? error.stack ?? error.message : String(error))
	}

	return { checks, errors, page }
}

/** Violations axe-core rates serious or critical, one line per rule and element. */
async function audit(page: Page) {
	await page.addScriptTag({ path: axe })
	const violations = await page.evaluate(async () => {
		const { violations } = await (globalThis as unknown as { axe: typeof import('axe-core') }).axe.run(document, { resultTypes: ['violations'] })
		return violations
			.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
			.flatMap(violation => violation.nodes.map(node => `${violation.id} (${violation.impact}) ${violation.help}: ${node.target.join(' ')}`))
	})
	return violations
}

const tabLimit = 200

/**
 * Tabs through the screen from the top of the document, asserting the focus
 * indicator on every stop; returns one message per failing stop, and one when
 * the walk checks no stop or never leaves the screen.
 */
async function tab(page: Page) {
	const messages: string[] = []
	const stops = await play(page, (play, root) => play.restFocus(root))
	let checked = 0
	for (; checked < tabLimit; checked++) {
		await page.keyboard.press('Tab')
		try {
			if (await play(page, (play, root) => play.assertFocusVisible(root)) === null) break
		} catch (error) {
			messages.push(reason(error))
		}
	}
	if (!checked && stops) messages.push(`Tab reached none of the ${stops} Tab stops in the screen`)
	if (checked === tabLimit) messages.push(`The Tab walk checked ${tabLimit} stops without leaving the screen`)
	return messages
}

/** The first line of a failed check, without Playwright's evaluate prefix. */
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))
	.split('\n')[0].replace(/^page\.evaluate: (?:Error: )?/, '')

/** The elements that show an open layer. */
const layered = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [popover]:popover-open'

/**
 * Clicks the first visible match of a layer's trigger and waits until the
 * trigger reports itself expanded or a layer that was not showing before shows.
 */
async function open(page: Page, layer: string, selector: string) {
	const trigger = page.locator(selector).filter({ visible: true }).first()
	const button = await trigger.elementHandle({ timeout: 5_000 })
	const before = await page.evaluateHandle(query =>
		new Set([...document.querySelectorAll(query)].filter(element => element.checkVisibility())), layered)
	await trigger.click({ timeout: 5_000 })
	await page.waitForFunction(([button, before, query]) => button?.getAttribute('aria-expanded') === 'true' ||
		[...document.querySelectorAll(query)].some(element => !before.has(element) && element.checkVisibility()),
	[button, before, layered] as const, { timeout: 5_000 }).catch(() => {
		throw new Error(`Layer ${layer} did not open from ${selector}`)
	})
	await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function screens(options: Options) {
	const name = browserName(options.browser)
	const { server, url } = await serve(options.port)
	const run = join(runs, new Date().toISOString().replace(/[:.]/g, '-'))
	const failures: Failure[] = []
	const filed = new Set<string>()
	const captures: Capture[] = []

	try {
		const match = options.match?.trim().toLowerCase()
		const stories = (await index(url, name)).filter(story => story.title.startsWith('Screens/') &&
			(!match || story.id.includes(match) || story.title.toLowerCase().includes(match) || story.name.toLowerCase().includes(match)))
		if (!stories.length) throw new Error('No Screens/* stories found.')

		mkdirSync(run, { recursive: true })
		const browser = await launch(name)

		try {
			for (const story of stories) {
				// A play that runs a runner check too (row) must not file the same line twice.
				const fail = (check: Failure['check'], variant: string, messages: string[]) => {
					for (const message of messages) {
						const key = JSON.stringify([story.id, check, variant, message])
						if (filed.has(key)) continue
						filed.add(key)
						failures.push({ check, id: story.id, message, variant })
					}
				}
				const layers = Object.entries(story.parameters?.layers ?? {}).map(([layer, value]) =>
					typeof value === 'string' ? { layer, trigger: value, widths: undefined } : { layer, ...value })
				for (const { layer, widths = [] } of layers) {
					const unknown = widths.filter(width => !variants.some(variant => variant.width === width))
					if (unknown.length) fail('play', layer, [`Layer ${layer} lists widths no variant has: ${unknown.join(', ')}`])
				}
				const shows = (layer: (typeof layers)[number], variant: Variant) => !layer.widths || layer.widths.includes(variant.width)
				const capture = async (page: Page, file: string) => {
					await page.screenshot({ animations: 'disabled', path: join(run, file) })
					captures.push({ file, id: story.id })
				}
				const guard = async (check: Failure['check'], variant: string, work: () => Promise<string[] | void>) => {
					try {
						fail(check, variant, await work() ?? [])
					} catch (error) {
						fail(check, variant, [reason(error)])
					}
				}

				await Promise.all(variants.map(async variant => {
					const { checks, errors, page } = await visit(browser, url, story, variant)
					try {
						if (errors.length) return fail('play', variant.name, errors)
						for (const { check, lines } of checks) fail(check, variant.name, lines)
						const height = await page.locator('[data-story-root]').first().evaluate(node => Math.ceil(node.scrollHeight))
						await page.setViewportSize({ width: variant.width, height: Math.max(900, height) })
						await capture(page, `${story.id}.${variant.name}.png`)
						await guard('row', variant.name, () => assert(page, (play, root) =>
							root.querySelector('[data-slot="field-row"]') && play.assertRowAligned(root)))
						await guard('target-size', variant.name, () => assert(page, (play, root) => play.assertTargetSize(root)))
						await guard('axe', variant.name, () => audit(page))
						await guard('focus', variant.name, () => tab(page))
						if (variant.width < 1280) {
							await page.setViewportSize({ width: 320, height: 900 })
							await guard('reflow', variant.name, () => assert(page, (play, root) => play.assertReflow(root)))
						}
						fail('play', variant.name, errors)
					} finally {
						await page.close()
					}

					for (const layer of layers) {
						if (!shows(layer, variant)) continue
						const label = `${variant.name} ${layer.layer}`
						// The play's own named failures were filed by the variant above.
						const { errors, page } = await visit(browser, url, story, variant)
						try {
							if (errors.length) {
								fail('play', label, errors)
								continue
							}
							await open(page, layer.layer, layer.trigger)
							await capture(page, `${story.id}--${layer.layer}.${variant.name}.png`)
							await guard('axe', label, () => audit(page))
							fail('play', label, errors)
						} catch (error) {
							fail('play', label, [reason(error)])
						} finally {
							await page.close()
						}
					}
				}))

				// Media emulation does not depend on the theme or direction: one variant is enough.
				const [first] = variants
				const forced = await visit(browser, url, story, first, { forcedColors: 'active' })
				try {
					if (forced.errors.length) fail('play', `${first.name} forced-colors`, forced.errors)
					else {
						await guard('forced-colors', first.name, () => assert(forced.page, (play, root) => play.assertForcedBoundaries(root)))
						await guard('forced-colors', first.name, () => tab(forced.page))
					}
				} finally {
					await forced.page.close()
				}

				for (const layer of layers) {
					const variant = variants.find(variant => shows(layer, variant))
					if (!variant) continue
					const label = `${variant.name} ${layer.layer}`
					const { errors, page } = await visit(browser, url, story, variant, { reducedMotion: 'reduce', still: false })
					try {
						if (errors.length) {
							fail('play', `${label} reduced-motion`, errors)
							continue
						}
						const opening = assert(page, play => play.assertNoTransformMotion(600))
						const problem = await open(page, layer.layer, layer.trigger).then(() => undefined, reason)
						const motion = await opening
						// Closing a layer that never opened proves nothing.
						if (problem) {
							fail('play', `${label} reduced-motion`, [problem])
							continue
						}
						fail('motion', `${label} open`, motion)
						const closing = assert(page, play => play.assertNoTransformMotion(600))
						await page.keyboard.press('Escape')
						fail('motion', `${label} close`, await closing)
					} catch (error) {
						fail('play', `${label} reduced-motion`, [reason(error)])
					} finally {
						await page.close()
					}
				}
			}
		} finally {
			await browser.close()
		}

		const reference = references(name)
		const differs = captures.filter(({ file }) => existsSync(join(reference, file)) &&
			!readFileSync(join(reference, file)).equals(readFileSync(join(run, file))))
		const unreferenced = captures.filter(({ file }) => !existsSync(join(reference, file)))
		// A known entry covers a failure of its check in its variants (a variant covers its layers) on its targets.
		const within = (variant: string, failure: Failure) => failure.variant === variant || failure.variant.startsWith(`${variant} `)
		const covers = (entry: Known, failure: Failure) => entry.check === failure.check &&
			(!entry.variants || entry.variants.some(variant => within(variant, failure))) &&
			(!entry.targets || entry.targets.some(target => failure.message.includes(target)))
		const entry = (failure: Failure) => failure.check === 'play'
			? undefined
			: stories.find(story => story.id === failure.id)?.parameters?.known?.find(entry => covers(entry, failure))
		const expected = failures.filter(entry)
		const real = failures.filter(failure => !entry(failure))
		// A known entry, and each variant and target it lists, must still cover a failure, so the list
		// only shrinks; a story whose own play failed skipped its checks and proves nothing either way.
		for (const story of stories) {
			if (real.some(failure => failure.id === story.id && failure.check === 'play')) continue
			for (const known of story.parameters?.known ?? []) {
				const covered = expected.filter(failure => failure.id === story.id && covers(known, failure))
				const passes = (part: string) => real.push({ check: known.check, id: story.id, message: `known failure (${known.slice}) passes now: ${part}`, variant: known.variants?.join(', ') ?? 'all' })
				if (!covered.length) {
					passes('remove it from parameters.known')
					continue
				}
				for (const variant of known.variants ?? []) {
					if (!covered.some(failure => within(variant, failure))) passes(`remove ${variant} from the entry`)
				}
				for (const target of known.targets ?? []) {
					if (!covered.some(failure => failure.message.includes(target))) passes(`remove ${target} from the entry`)
				}
			}
		}

		const line = (failure: Failure) => `${failure.id} [${failure.variant}] ${failure.check}: ${failure.message}`
		writeFileSync(join(run, 'summary.json'), `${JSON.stringify({ browser: name, captures, known: expected, passed: !real.length, real } satisfies Summary, null, '\t')}\n`)
		console.log(`Screens captures written to ${run}`)
		if (differs.length) console.log(`Differs from the reference:\n${differs.map(({ file }) => `  ${file}`).join('\n')}`)
		else if (unreferenced.length < captures.length) console.log('No capture differs from its reference.')
		if (unreferenced.length) console.log(`No reference yet:\n${unreferenced.map(({ file }) => `  ${file}`).join('\n')}`)
		if (expected.length) console.log(`Known failures:\n${expected.map(failure => `  ${line(failure)} (${entry(failure)?.slice})`).join('\n')}`)
		if (real.length) throw new Error(`Screens failed ${real.length} checks:\n${real.map(line).join('\n')}`)
		console.log(`Screens passed in ${name} for ${stories.length} screen stories in ${variants.length} variants.`)
	} finally {
		await server.close()
	}
}

/** Copies the latest passing run's captures of the matching screens into the D30 references. */
function accept(options: Options) {
	const name = browserName(options.browser)
	const screen = typeof options.accept === 'string' ? options.accept.trim().toLowerCase() : ''
	if (!screen) throw new Error('--accept needs a screen id, for example screens-form.')
	const latest = existsSync(runs) ? readdirSync(runs).sort().at(-1) : undefined
	const file = latest && join(runs, latest, 'summary.json')
	if (!file || !existsSync(file)) throw new Error('No finished screens run to accept from: run stories:test:screens first.')
	const summary = JSON.parse(readFileSync(file, 'utf8')) as Summary
	if (!summary.passed || summary.browser !== name) throw new Error(`The latest run (${latest}) did not pass in ${name}.`)
	const chosen = summary.captures.filter(capture => capture.id.startsWith(`${screen}--`))
	if (!chosen.length) throw new Error(`The latest run (${latest}) has no capture of ${screen}.`)

	const reference = references(name)
	mkdirSync(reference, { recursive: true })
	for (const capture of chosen) copyFileSync(join(runs, latest, capture.file), join(reference, capture.file))
	console.log(`Accepted ${chosen.length} captures of ${screen} from ${latest} into ${reference}`)
}

const cli = sade('stories')

cli.command('dev', 'Start the Ajo UI stories harness', { default: true })
	.option('-p, --port', 'Port number', 5182)
	.action(async (options: Options) => {
		await dev(options)
	})

cli.command('test', 'Run the stories smoke suite')
	.option('-b, --browser', 'Playwright browser: chromium, firefox, or webkit', 'chromium')
	.option('--cycles', 'Run real Popover open/close lifecycle cycles', 0)
	.option('-m, --match', 'Only run stories whose title, name, or id contains this text')
	.option('-p, --port', 'Port number', 5182)
	.option('--screenshots', 'Write screenshots to .tmp/stories-screenshots')
	.option('--screens', 'Run Screens/* in five variants with their checks, capturing to .tmp/screens/<run>')
	.option('--accept', 'With --screens: copy the latest passing run captures of this screen into the references')
	.action(async (options: Options) => {
		if (options.accept !== undefined && !options.screens) throw new Error('--accept works with --screens.')
		if (options.screens && (options.screenshots || Number(options.cycles ?? 0))) {
			throw new Error('--screens runs apart from --screenshots and --cycles.')
		}
		if (options.accept !== undefined) accept(options)
		else if (options.screens) await screens(options)
		else await test(options)
	})

const output = cli.parse(process.argv, { lazy: true })
if (!output) process.exit(0)

try {
	await output.handler(...output.args)
} catch (error) {
	console.error(error instanceof Error ? error.stack ?? error.message : error)
	process.exit(1)
}
