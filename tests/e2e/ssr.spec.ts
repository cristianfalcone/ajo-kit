import { expect, test } from '@playwright/test'
import { createUser, gotoReady, loginPage, loginRequest } from './helpers'

const varyIncludes = (value: string | undefined, token: string) =>
	value?.toLowerCase().split(',').map(part => part.trim()).includes(token.toLowerCase())

test('SSR HTML uses no-store headers and a non-executable boot data script', async ({ request, baseURL }) => {
	await loginRequest(request, baseURL!)

	const response = await request.get('/dashboard', {
		headers: { Accept: 'text/html' },
	})

	expect(response.status()).toBe(200)
	expect(response.headers()['content-type']).toContain('text/html')
	expect(response.headers()['cache-control']).toBe('no-store')
	expect(varyIncludes(response.headers().vary, 'Accept')).toBe(true)
	expect(varyIncludes(response.headers().vary, 'Cookie')).toBe(true)

	const html = await response.text()

	expect(html).toContain('<script type="application/json" id="__SSR__">')
	expect(html).not.toContain('globalThis.__SSR__')
	expect(html).not.toContain('rawServerData')
})

test('SSR boot payload keeps script-breaking user data inert', async ({ page }) => {
	const marker = '</script><script>window.__xss=1</script>'
	const email = `xss-${Date.now()}@example.com`

	await createUser({ email, name: marker })
	await page.addInitScript(() => { delete (window as any).__xss })
	await loginPage(page, { email, password: 'password' })

	const response = await page.goto('/dashboard')
	const html = await response!.text()

	expect(html).not.toContain(marker)

	await gotoReady(page, '/dashboard')
	await expect(page.getByText(marker).first()).toBeVisible()
	expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined()
})

test('non-redirect actions refresh active route when SSE is unavailable', async ({ page }) => {
	await page.addInitScript(() => { (window as any).__AJO_DISABLE_SSE__ = true })
	await loginPage(page)

	await gotoReady(page, '/account/profile')

	const name = `No SSE ${Date.now()}`

	await page.locator('input[name="name"]').fill(name)
	await page.getByRole('button', { name: 'Save Name' }).click()

	await expect(page.getByText('Name updated successfully!')).toBeVisible()
	await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
})

test('token actions refresh list data when SSE is unavailable', async ({ page }) => {
	await page.addInitScript(() => { (window as any).__AJO_DISABLE_SSE__ = true })
	await loginPage(page)

	const tokenName = `No SSE Token ${Date.now()}`

	await gotoReady(page, '/account/tokens')
	await page.locator('input[name="name"]').fill(tokenName)
	await page.locator('label', { hasText: 'tokens:read' }).click()
	await page.getByRole('button', { name: 'Create Token' }).click()

	await expect(page.getByText("Token created! Copy it now - it won't be shown again.")).toBeVisible()
	await expect(page.locator('tr', { hasText: tokenName })).toBeVisible()
})
