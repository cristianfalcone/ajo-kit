import { expect, request, test, type Page } from './test'
import {
	proof,
	admin as creds,
	data,
	goto,
	signin,
	login,
	member,
} from './helpers'

const room = (page: Page) => {
	const viewport = page.locator('[data-slot="message-scroller-viewport"]')
	const items = page.locator('[data-slot="message-scroller-item"]')
	const ids = () => items.evaluateAll(nodes => nodes.map(node => Number((node as HTMLElement).dataset.messageId)))
	// A scroll during the scroller's own jump would be taken back by it.
	const scroll = async (to: 'top' | 'middle' | 'end') => {
		await expect(viewport).not.toHaveAttribute('data-autoscrolling')
		await viewport.evaluate((node, to) => node.scrollTo({
			top: to === 'top' ? 0 : to === 'end' ? node.scrollHeight : (node.scrollHeight - node.clientHeight) / 2,
		}), to)
	}

	// Keeps scrolling toward an edge, as a reader would, until a page arrives past it.
	const pageAt = async (edge: 'top' | 'end') => {
		const before = await ids()
		const past = edge === 'top' ? before[0] : before.at(-1)!

		await expect.poll(async () => {
			const now = await ids()
			const id = edge === 'top' ? now[0] : now.at(-1)!
			if (id === past) await scroll(edge)
			return edge === 'top' ? past - id : id - past
		}).toBeGreaterThan(0)

		return past
	}

	return {
		items,
		ids,
		scroll,
		pageAt,
		message: (id: number) => page.locator(`[data-message-id="${id}"]`),
	}
}

// Posts into the conversation between Cristian and Emily (chat 1), as Emily unless told otherwise.
const post = async (base: string, texts: string[], credentials = member) => {
	const sender = await request.newContext({ baseURL: base })

	try {
		await login(sender, base, credentials)
		for (const text of texts) {
			expect((await sender.post('/account/chats/1?/send', { headers: proof(base), data: { text } })).status()).toBe(200)
		}
	} finally {
		await sender.dispose()
	}
}

test('chat room sends a message and streams it to another active participant', async ({ browser, baseURL }) => {
	const ctx = await browser.newContext({ baseURL })
	const peer = await browser.newContext({ baseURL })
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
		await root.getByRole('button', { name: /^Send$/ }).click()

		const live = client.locator('[data-message-id]').filter({ hasText: message })

		await expect(root.locator('[data-message-id]').filter({ hasText: message })).toBeVisible()
		await expect(live).toBeVisible()

		await client.waitForTimeout(200)
		expect(await live.getAttribute('class')).not.toContain('bg-warning')

		// Alternating-runs regression: reply and follow up so the timeline has
		// consecutive same-day runs per sender, then assert every rendered
		// message is unique (duplicate sibling keys once collapsed runs).
		const reply = `E2E alternating reply ${Date.now()}`
		await client.getByPlaceholder('Type a message...').fill(reply)
		await client.getByRole('button', { name: /^Send$/ }).click()
		await expect(root.locator('[data-message-id]').filter({ hasText: reply })).toBeVisible()

		const followUp = `E2E alternating follow-up ${Date.now()}`
		await root.getByPlaceholder('Type a message...').fill(followUp)
		await root.getByRole('button', { name: /^Send$/ }).click()
		await expect(client.locator('[data-message-id]').filter({ hasText: followUp })).toBeVisible()

		const ids = await root.locator('[data-message-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-message-id')))
		expect(new Set(ids).size).toBe(ids.length)
		expect(ids.length).toBeGreaterThanOrEqual(3)
	} finally {
		await root.close()
		await ctx.close()
		await client.close()
		await peer.close()
	}
})

test('chat sender sees first message and recipient unread badge clears after opening', async ({ browser, baseURL }) => {
	const senderContext = await browser.newContext({ baseURL })
	const recipientContext = await browser.newContext({ baseURL })
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
		await sender.getByRole('button', { name: /^Send$/ }).click()

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
		await expect(received).toHaveClass(/bg-warning/)
		await expect(unread).toHaveCount(0)
		await expect(navBadge).toHaveCount(0)
	} finally {
		await sender.close()
		await senderContext.close()
		await recipient.close()
		await recipientContext.close()
	}
})

test('active chat page receives newly created chats in the sidebar list', async ({ browser, baseURL }) => {
	const senderContext = await browser.newContext({ baseURL })
	const recipientContext = await browser.newContext({ baseURL })
	const sender = await senderContext.newPage()
	const recipient = await recipientContext.newPage()

	try {
		await signin(recipient)
		await goto(recipient, '/account/chats/1')
		await expect(recipient.getByPlaceholder('Type a message...')).toBeVisible()

		await signin(sender, { email: 'user01@example.com', password: 'password' })

		const group = `Live Invite ${Date.now()}`
		const message = `Live invite message ${Date.now()}`
		const navBadge = recipient
			.getByRole('link', { name: /Cristian Falcone/ })
			.locator('span')
			.filter({ hasText: /^1$/ })

		await goto(sender, '/account/chats')
		await sender.getByRole('button', { name: 'New chat' }).click()
		await sender.getByRole('button', { name: 'Cristian Falcone' }).click()
		await sender.getByRole('button', { name: 'Test User 02' }).click()
		await sender.getByPlaceholder('Group name (optional)').fill(group)
		await sender.getByRole('button', { name: 'Create Group' }).click()
		await expect(sender.getByRole('heading', { name: group })).toBeVisible()

		await sender.getByPlaceholder('Type a message...').fill(message)
		await sender.getByRole('button', { name: /^Send$/ }).click()
		await expect(sender.locator('[data-message-id]').filter({ hasText: message })).toBeVisible()

		const link = recipient.getByRole('link', { name: new RegExp(group) })
		const unread = link.locator('span').filter({ hasText: /^1$/ })

		await expect(navBadge).toBeVisible()
		await expect(link).toBeVisible()
		await expect(unread).toBeVisible()
	} finally {
		await sender.close()
		await senderContext.close()
		await recipient.close()
		await recipientContext.close()
	}
})

test('active chat page receives newly created direct chats before any message', async ({ browser, baseURL }) => {
	const senderContext = await browser.newContext({ baseURL })
	const recipientContext = await browser.newContext({ baseURL })
	const sender = await senderContext.newPage()
	const recipient = await recipientContext.newPage()

	try {
		await signin(recipient)
		await goto(recipient, '/account/chats/1')
		await expect(recipient.getByPlaceholder('Type a message...')).toBeVisible()

		await signin(sender, { email: 'user30@example.com', password: 'password' })
		await goto(sender, '/account/chats')
		await sender.getByRole('button', { name: 'New chat' }).click()
		await sender.getByRole('button', { name: 'Cristian Falcone' }).click()
		await sender.getByRole('button', { name: 'Start chat' }).click()
		await expect(sender).toHaveURL(/\/account\/chats\/\d+$/)

		const room = new URL(sender.url()).pathname
		const link = recipient.locator(`a[href="${room}"]`)

		await expect(link).toContainText('Test User 30')
		await expect(link).toContainText('No messages yet')
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

test('chat route navigation preserves reusable DOM shells', async ({ page }) => {
	await signin(page)
	await goto(page, '/account/chats/1')

	const group = `DOM Reuse ${Date.now()}`

	await page.getByRole('button', { name: 'New chat' }).click()
	await page.getByRole('button', { name: 'Test User 01' }).click()
	await page.getByRole('button', { name: 'Test User 02' }).click()
	await page.getByPlaceholder('Group name (optional)').fill(group)
	await page.getByRole('button', { name: 'Create Group' }).click()
	await expect(page).toHaveURL(/\/account\/chats\/\d+$/)
	await expect(page.getByRole('heading', { name: group })).toBeVisible()

	const next = new URL(page.url()).pathname

	await goto(page, '/account/chats/1')
	await expect(page.getByPlaceholder('Type a message...')).toBeVisible()

	await page.evaluate(() => {
		const find = (needle: string) => {
			const element = [...document.querySelectorAll<HTMLElement>('*')]
				.find(element => element.className.includes(needle))

			if (!element) throw new Error(`Missing element with class fragment: ${needle}`)

			return element
		}

		const root = document.getElementById('root')
		const main = document.querySelector('main')

		if (!root || !main) throw new Error('Missing app root')

		;(window as typeof window & {
			__chatDomRefs?: Record<string, Element | null>
			__chatDomMarker?: boolean
		}).__chatDomRefs = {
			root,
			main,
			account: main.firstElementChild,
			chats: find('h-[calc(100vh-7.5rem)]'),
			list: find('overflow-y-auto px-2 pb-3'),
			room: find('h-full min-h-0 min-w-0 flex-col'),
		}

		;(window as typeof window & { __chatDomMarker?: boolean }).__chatDomMarker = true
	})

	await page.locator(`a[href="${next}"]`).click()
	await expect(page).toHaveURL(new RegExp(`${next}$`))
	await expect(page.getByRole('heading', { name: group })).toBeVisible()

	const reused = await page.evaluate(() => {
		const scope = window as typeof window & {
			__chatDomRefs?: Record<string, Element | null>
			__chatDomMarker?: boolean
		}

		if (!scope.__chatDomMarker || !scope.__chatDomRefs) {
			return { document: false }
		}

		const find = (needle: string) => [...document.querySelectorAll<HTMLElement>('*')]
			.find(element => element.className.includes(needle)) ?? null
		const refs = scope.__chatDomRefs
		const main = document.querySelector('main')

		return {
			document: true,
			root: refs.root === document.getElementById('root'),
			main: refs.main === main,
			account: refs.account === main?.firstElementChild,
			chats: refs.chats === find('h-[calc(100vh-7.5rem)]'),
			list: refs.list === find('overflow-y-auto px-2 pb-3'),
			room: refs.room === find('h-full min-h-0 min-w-0 flex-col'),
		}
	})

	expect(reused).toEqual({
		document: true,
		root: true,
		main: true,
		account: true,
		chats: true,
		list: true,
		room: true,
	})
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

test('chat actions refuse malformed and over-bound input with 400', async ({ request, baseURL: base }) => {
	await login(request, base!, creds)

	const me = (await (await request.get('/api/me')).json()).id as number
	const chats = await request.get('/account/chats', { headers: { Accept: 'application/json' } })
	const users = (await chats.json()).data.find((entry: { users?: unknown }) => Array.isArray(entry?.users)).users
	const peer = users.find((user: { name: string }) => user.name === 'Emily Stone').id as number
	const post = (path: string, data: Record<string, unknown>) => request.post(path, { headers: proof(base!), data })

	for (const [path, data] of [
		['/account/chats?/start', { users: '[2' }],
		['/account/chats?/start', { users: '{"0":2}' }],
		['/account/chats?/start', { users: '[1.5]' }],
		['/account/chats?/start', { users: '[]' }],
		['/account/chats?/start', { users: JSON.stringify([me, me]) }],
		['/account/chats?/start', { users: JSON.stringify([peer]), name: 'x'.repeat(81) }],
		['/account/chats/1?/send', { text: 42 }],
		['/account/chats/1?/send', { text: '   ' }],
		['/account/chats/1?/send', { text: 'x'.repeat(4001) }],
		['/account/chats/1?/load', { cursor: 'x', direction: 'older' }],
		['/account/chats/1?/load', { cursor: 0, direction: 'older' }],
		['/account/chats/1?/load', { cursor: 5, direction: 'sideways' }],
	] as const) {
		expect((await post(path, data)).status(), `${path} ${JSON.stringify(data).slice(0, 80)}`).toBe(400)
	}

	const direct = await post('/account/chats?/start', { users: JSON.stringify([peer, peer, me]) })

	expect(direct.status()).toBe(200)
	await expect(direct.json()).resolves.toMatchObject({ redirect: expect.stringMatching(/^\/account\/chats\/\d+$/) })
})

test('chat room pages a bounded window around a stable viewport and returns with the edge button', async ({ page, baseURL }) => {
	await post(baseURL!, Array.from({ length: 45 }, (_, index) => `History ${index + 1}`), creds)
	await signin(page)
	await goto(page, '/account/chats/1')

	const transcript = room(page)
	const end = page.getByRole('button', { name: 'Scroll to end' })

	await expect(transcript.items.last()).toBeInViewport()
	await expect(end).toHaveAttribute('data-active', 'false')

	await transcript.scroll('middle')
	await expect(end).toHaveAttribute('data-active', 'true')
	await end.click()
	await expect(transcript.items.last()).toBeInViewport()
	await expect(end).toHaveAttribute('data-active', 'false')

	const newest = (await transcript.ids()).at(-1)!

	for (let round = 0; round < 4; round++) {
		const first = await transcript.pageAt('top')

		await expect(transcript.message(first)).toBeInViewport()
		expect((await transcript.ids()).length).toBeLessThanOrEqual(30)
	}

	expect(await transcript.ids()).not.toContain(newest)

	const last = await transcript.pageAt('end')

	await expect(transcript.message(last)).toBeInViewport()
	expect((await transcript.ids()).length).toBeLessThanOrEqual(30)
})

test('chat room in a tall viewport fills it with older pages and then stops loading', async ({ page, baseURL }) => {
	await post(baseURL!, Array.from({ length: 60 }, (_, index) => `Tall ${index + 1}`), creds)
	await page.setViewportSize({ width: 1280, height: 3200 })

	let loads = 0

	page.on('request', request => {
		if (request.method() === 'POST' && request.url().includes('?/load')) loads++
	})

	await signin(page)
	await goto(page, '/account/chats/1')

	const transcript = room(page)

	await expect(transcript.items.last()).toBeInViewport()
	await expect(transcript.items.first()).not.toBeInViewport()

	// Settled: a whole second passes without a page, then two more stay quiet.
	await expect.poll(async () => {
		const before = loads
		await page.waitForTimeout(1000)
		return loads - before
	}).toBe(0)

	const settled = loads

	await page.waitForTimeout(2000)
	expect(loads).toBe(settled)
	await expect(transcript.items.last()).toBeInViewport()
})

test('chat room opens at the first unread message beyond one page, lights the unread run and marks it seen', async ({ page, baseURL }) => {
	const tag = `Unread run ${Date.now()}`
	const texts = Array.from({ length: 12 }, (_, index) => `${tag} u${String(index + 1).padStart(2, '0')}`)

	await signin(page)
	await post(baseURL!, texts)
	await goto(page, '/account/chats/1')

	const first = room(page).items.filter({ hasText: texts[0] })

	await expect(first).toBeInViewport()
	await expect(first).toHaveClass(/bg-warning/)
	await expect.poll(async () => (await data(page.request, '/account/chats/1')).unreadCount).toBe(0)
	await expect(first).not.toHaveClass(/bg-warning/)
})

test('chat room shows a pill for messages that arrive out of view, jumps to them and follows a sent message', async ({ page, baseURL }) => {
	await signin(page)
	await goto(page, '/account/chats/1')

	const transcript = room(page)
	const text = `Out of view ${Date.now()}`

	await transcript.pageAt('top')
	await post(baseURL!, [text])

	const pill = page.getByRole('button', { name: '1 new message' })
	const arrived = transcript.items.filter({ hasText: text })

	await expect(pill).toBeVisible()
	await expect(arrived).not.toBeInViewport()
	await pill.click()
	await expect(arrived).toBeInViewport()
	await expect(pill).toHaveCount(0)
	await expect.poll(async () => (await data(page.request, '/account/chats/1')).unreadCount).toBe(0)

	const sent = `Sent from above ${Date.now()}`

	await transcript.scroll('top')
	await expect(arrived).not.toBeInViewport()
	await page.getByPlaceholder('Type a message...').fill(sent)
	await page.getByRole('button', { name: /^Send$/ }).click()
	await expect(transcript.items.filter({ hasText: sent })).toBeInViewport()
})
