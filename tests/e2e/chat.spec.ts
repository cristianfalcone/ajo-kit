import { expect, test } from '@playwright/test'
import { gotoReady, loginPage } from './helpers'

test('chat room sends a message and streams it to another active participant', async ({ browser }) => {
	const adminContext = await browser.newContext()
	const userContext = await browser.newContext()
	const admin = await adminContext.newPage()
	const user = await userContext.newPage()

	try {
		await loginPage(admin)
		await loginPage(user, { email: 'emily@example.com', password: 'password' })

		await gotoReady(admin, '/account/chats')
		await admin.getByRole('link', { name: /Emily Stone/ }).click()
		await expect(admin).toHaveURL(/\/account\/chats\/\d+$/)

		const roomUrl = admin.url()
		const message = `E2E live message ${Date.now()}`

		await gotoReady(user, roomUrl)
		await expect(user.getByPlaceholder('Type a message...')).toBeVisible()

		await admin.getByPlaceholder('Type a message...').fill(message)
		await admin.getByRole('button', { name: 'Send' }).click()

		await expect(admin.getByText(message)).toBeVisible()
		await expect(user.getByText(message)).toBeVisible()
	} finally {
		await adminContext.close()
		await userContext.close()
	}
})

test('chat list starts a new group conversation from selected users', async ({ page }) => {
	await loginPage(page)

	const groupName = `E2E Group ${Date.now()}`

	await gotoReady(page, '/account/chats')
	await page.getByRole('button', { name: 'Test User 01' }).click()
	await page.getByRole('button', { name: 'Test User 02' }).click()
	await page.getByPlaceholder('Group name (optional)').fill(groupName)
	await page.getByRole('button', { name: 'Create Group' }).click()

	await expect(page).toHaveURL(/\/account\/chats\/\d+$/)
	await expect(page.getByRole('heading', { name: groupName })).toBeVisible()
	await expect(page.getByText('3 participants')).toBeVisible()
	await expect(page.getByText('No messages yet. Start the conversation!')).toBeVisible()
})
