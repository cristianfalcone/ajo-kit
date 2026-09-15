import { expect, test, type Page } from './test'

const ready = async (page: Page) => page.waitForFunction(() => document.documentElement.dataset.ajoReady === "true")

const route = '/__e2e/navigation/one'

// Native fragment movement happens before the router completes its own scroll.
// Assert after the position settles, so an initial native jump cannot hide a reset.
const settled = async (page: Page) => page.evaluate(async () => {
	let previous = scrollY, stable = 0
	for (let frame = 0; frame < 300; frame++) {
		await new Promise(requestAnimationFrame)
		stable = Math.abs(scrollY - previous) < .2 ? stable + 1 : 0
		previous = scrollY
		if (stable >= 12) return
	}
	throw new Error('Navigation scroll did not settle')
})

const target = async (page: Page, id = 'destination') => {
	await settled(page)
	const top = await page.evaluate(id => document.getElementById(id)?.getBoundingClientRect().top, id)
	expect(top).toBeDefined()
	expect(Math.abs(top! - 32)).toBeLessThan(2)
}

test('same-document fragments stay at their destination after route resolution', async ({ page }) => {
	await page.goto(route)
	await ready(page)
	await page.getByRole('link', { name: 'Same document', exact: true }).click()
	await expect(page).toHaveURL(/#destination$/)
	await target(page)
})

test('fragments resolve after another page renders and through back/forward', async ({ page }) => {
	await page.goto(route)
	await ready(page)
	await page.getByRole('link', { name: 'Same document', exact: true }).click()
	await target(page)
	await page.getByRole('link', { name: 'Other document', exact: true }).click()
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Navigation two')
	await target(page)
	await page.goBack()
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Navigation one')
	await target(page)
	await page.goForward()
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Navigation two')
	await target(page)
})

test('encoded and malformed-escape fragment IDs match without a CSS selector', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', error => errors.push(error.message))
	await page.goto(route)
	await ready(page)
	await page.getByRole('link', { name: 'Encoded fragment', exact: true }).click()
	await target(page, 'part:two')
	await page.getByRole('link', { name: 'Literal percent', exact: true }).click()
	await target(page, 'bad%fragment')
	expect(errors).toEqual([])
})

test('missing, empty and absent fragments use the ordinary page-top behavior', async ({ page }) => {
	await page.goto(route)
	await ready(page)
	for (const name of ['Missing fragment', 'Top']) {
		await page.getByRole('link', { name, exact: true }).click()
		await settled(page)
		expect(await page.evaluate(() => scrollY)).toBe(0)
	}
	await page.getByRole('link', { name: 'Other page without fragment', exact: true }).click()
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Navigation two')
	await settled(page)
	expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('initial fragment navigation respects reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto(route + '#part%3Atwo')
	await ready(page)
	await target(page, 'part:two')
})
