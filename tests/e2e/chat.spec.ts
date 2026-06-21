import { expect, request, test } from '@playwright/test'
import {
	proof,
	admin as creds,
	goto,
	signin,
	login,
	member,
} from './helpers'

test('chat room sends a message and streams it to another active participant', async ({ browser }) => {
	const ctx = await browser.newContext()
	const peer = await browser.newContext()
	const root = await ctx.newPage()
	const client = await peer.newPage()

	try {
		await signin(root)
		await signin(client, { email: 'emily@example.com', password: 'password' })

		await goto(root, '/account/chats')
		await root.getByRole('link', { name: /Emily Stone/ }).click()
		await expect(root).toHaveURL(/\/account\/chats\/\d+$/)

		const room = root.url()
		const message = `E2E live message ${Date.now()}`

		await goto(client, room)
		await expect(client.getByPlaceholder('Type a message...')).toBeVisible()

		await root.getByPlaceholder('Type a message...').fill(message)
		await root.getByRole('button', { name: 'Send' }).click()

		const live = client.locator('[data-message-id]').filter({ hasText: message })

		await expect(root.locator('[data-message-id]').filter({ hasText: message })).toBeVisible()
		await expect(live).toBeVisible()

		await client.waitForTimeout(200)
		expect(await live.getAttribute('class')).not.toContain('bg-amber')
	} finally {
		await root.close()
		await ctx.close()
		await client.close()
		await peer.close()
	}
})

test('chat sender sees first message and recipient unread badge clears after opening', async ({ browser }) => {
	const senderContext = await browser.newContext()
	const recipientContext = await browser.newContext()
	const sender = await senderContext.newPage()
	const recipient = await recipientContext.newPage()

	try {
		await signin(recipient)
		await signin(sender, { email: 'user01@example.com', password: 'password' })

		await goto(sender, '/account/chats')
		await sender.getByRole('button', { name: 'New chat' }).click()
		await sender.getByRole('button', { name: 'Cristian Falcone' }).click()
		await sender.getByRole('button', { name: 'Start chat' }).click()
		await expect(sender).toHaveURL(/\/account\/chats\/\d+$/)

		const room = new URL(sender.url()).pathname
		const message = `First direct message ${Date.now()}`
		const navBadge = recipient
			.getByRole('link', { name: /Cristian Falcone/ })
			.locator('span')
			.filter({ hasText: /^1$/ })

		await sender.getByPlaceholder('Type a message...').fill(message)
		await sender.getByRole('button', { name: 'Send' }).click()

		await expect(sender.locator('[data-message-id]').filter({ hasText: message })).toBeVisible()
		await expect(navBadge).toBeVisible()

		await goto(recipient, '/account/chats')

		const link = recipient.locator(`a[href="${room}"]`)
		const unread = link.locator('span').filter({ hasText: /^1$/ })

		await expect(link).toContainText('Test User 01')
		await expect(unread).toBeVisible()

		await link.click()

		const received = recipient.locator('[data-message-id]').filter({ hasText: message })

		await expect(recipient).toHaveURL(new RegExp(`${room}$`))
		await expect(received).toBeVisible()
		await expect(received).toHaveClass(/bg-amber/)
		await expect(unread).toHaveCount(0)
		await expect(navBadge).toHaveCount(0)
	} finally {
		await sender.close()
		await senderContext.close()
		await recipient.close()
		await recipientContext.close()
	}
})

test('chat section starts a new group conversation from selected users', async ({ page }) => {
	await signin(page)

	const group = `E2E Group ${Date.now()}`

	await goto(page, '/account/chats/1')
	await page.getByRole('button', { name: 'New chat' }).click()
	await page.getByRole('button', { name: 'Test User 01' }).click()
	await page.getByRole('button', { name: 'Test User 02' }).click()
	await page.getByPlaceholder('Group name (optional)').fill(group)
	await page.getByRole('button', { name: 'Create Group' }).click()

	await expect(page).toHaveURL(/\/account\/chats\/\d+$/)
	await expect(page.getByRole('heading', { name: group })).toBeVisible()
	await expect(page.getByText('3 participants')).toBeVisible()
	await expect(page.getByText('No messages yet. Start the conversation!')).toBeVisible()
})

test('chat unread metadata tracks oldest unseen message and clears when seen', async ({ baseURL: base }) => {
	const root = await request.newContext({ baseURL: base })
	const client = await request.newContext({ baseURL: base })

	try {
		await login(root, base!, creds)
		await login(client, base!, member)

		const before = await client.get('/account/chats/1', {
			headers: { Accept: 'application/json' },
		})
		const initial = (await before.json()).data.at(-1)

		expect(initial.unreadCount).toBe(0)
		expect(initial.oldestUnreadId).toBeNull()

		const text = `Unread metadata ${Date.now()}`
		const send = await root.post('/account/chats/1?/send', {
			headers: proof(base!),
			data: { text },
		})

		expect(send.status()).toBe(200)

		const after = await client.get('/account/chats/1', {
			headers: { Accept: 'application/json' },
		})
		const later = (await after.json()).data.at(-1)
		const message = later.messages.find((entry: { text: string }) => entry.text === text)

		expect(message?.id).toBeTruthy()
		expect(later.unreadCount).toBe(1)
		expect(later.oldestUnreadId).toBe(message.id)

		const seen = await client.post('/account/chats/1?/markAsSeen', {
			headers: proof(base!),
		})

		expect(seen.status()).toBe(200)

		const cleared = await client.get('/account/chats/1', {
			headers: { Accept: 'application/json' },
		})
		const empty = (await cleared.json()).data.at(-1)

		expect(empty.unreadCount).toBe(0)
		expect(empty.oldestUnreadId).toBeNull()
	} finally {
		await root.dispose()
		await client.dispose()
	}
})
