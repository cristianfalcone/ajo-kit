import { afterAll, beforeAll, expect, test } from 'vitest'
import { start } from './server'

let app: Awaited<ReturnType<typeof start>>
beforeAll(async () => { app = await start() }, 60_000)
afterAll(async () => { await app?.close() })

const request = (path: string, cookie?: string, body?: unknown, origin?: string) => fetch(`${app.url}${path}`, {
	method: body === undefined ? 'GET' : 'POST',
	redirect: 'manual',
	headers: {
		Accept: 'application/json',
		...(body !== undefined && { 'Content-Type': 'application/json', Origin: origin ?? app.url }),
		...(cookie && { Cookie: cookie }),
	},
	...(body !== undefined && { body: JSON.stringify(body) }),
})

const signup = (email: string) => request('/register', undefined, {
	name: 'Reader', email, password: 'a-long-test-password', confirm: 'a-long-test-password',
})
const login = async (email: string) => {
	const response = await request('/login', undefined, { email, password: 'a-long-test-password' })
	expect(response.status).toBe(200)
	expect(await response.json()).toMatchObject({ redirect: '/notes' })
	const cookie = response.headers.get('set-cookie')
	expect(cookie).toContain('HttpOnly')
	return cookie!.split(';')[0]
}
const load = async (cookie: string) => {
	const response = await request('/notes', cookie)
	expect(response.status).toBe(200)
	const payload = await response.json()
	return { ...payload.data.at(-1), topics: payload.topics }
}

test('registration, validation, session, CSRF and logout traverse the real request boundary', async () => {
	const guest = await request('/notes')
	expect(await guest.json()).toMatchObject({ redirect: '/login' })
	const invalid = await request('/register', undefined, {
		name: 'Reader', email: 'reader@example.test', password: 'a-long-test-password', confirm: 'different-password',
	})
	expect(invalid.status).toBe(400)
	expect(JSON.stringify(await invalid.json())).toContain('Passwords do not match')
	expect((await signup('reader@example.test')).status).toBe(200)
	expect((await signup('reader@example.test')).status).toBe(400)
	const unknown = await request('/login', undefined, { email: 'missing@example.test', password: 'a-long-test-password' })
	const wrong = await request('/login', undefined, { email: 'reader@example.test', password: 'wrong' })
	expect(unknown.status).toBe(401)
	expect(await unknown.json()).toEqual(await wrong.json())
	const cookie = await login('reader@example.test')
	const refused = await request('/notes?/add', cookie, { text: 'Must not be stored' }, 'https://other.example')
	expect(refused.status).toBe(403)
	expect(JSON.stringify(await refused.json())).toContain('Invalid CSRF token')
	expect((await load(cookie)).notes).toEqual([])
	const invalidNote = await request('/notes?/add', cookie, { text: ' '.repeat(3) })
	expect(invalidNote.status).toBe(400)
	const out = await request('/notes?/logout', cookie, {})
	expect(await out.json()).toMatchObject({ redirect: '/login' })
	expect(out.headers.get('set-cookie')).toContain('Max-Age=0')
	expect(await (await request('/notes', cookie)).json()).toMatchObject({ redirect: '/login' })
})

test('notes, delete authority, live topics and captured email stay within each account', async () => {
	expect((await signup('alice@example.test')).status).toBe(200)
	expect((await signup('bob@example.test')).status).toBe(200)
	const alice = await login('alice@example.test')
	const bob = await login('bob@example.test')
	const added = await request('/notes?/add', alice, { text: '  A private thought  ' })
	expect(added.status).toBe(200)
	const update = await added.json()
	const own = await load(alice)
	expect(own.notes).toHaveLength(1)
	expect(own.notes[0].text).toBe('A private thought')
	expect(update.topics).toHaveLength(1)
	expect(own.topics).toContain(update.topics[0])
	const other = await load(bob)
	expect(other.notes).toEqual([])
	expect(other.topics).not.toContain(update.topics[0])
	const foreign = await request('/notes?/remove', bob, { id: own.notes[0].id })
	expect(foreign.status).toBe(404)
	expect((await load(alice)).notes).toHaveLength(1)
	expect((await request('/notes?/email', alice, {})).status).toBe(403)
	expect((await request('/notes?/verify', alice, { to: 'bob@example.test' })).status).toBe(200)
	const pending = await load(alice)
	expect(pending.user.verified).toBe(false)
	expect(pending.mail).toHaveLength(1)
	expect(pending.mail[0].subject).toBe('Verify your email')
	expect(pending.mail[0].text).not.toContain('A private thought')
	expect((await load(bob)).mail).toEqual([])
	expect((await request('/notes?/verify', alice, {})).status).toBe(429)
	const path = new URL(pending.mail[0].link).pathname
	const invalid = await request('/verify/invalid')
	expect((await invalid.json()).data.at(-1)).toEqual({ verified: false })
	const confirmed = await request(path)
	expect((await confirmed.json()).data.at(-1)).toEqual({ verified: true })
	expect((await load(alice)).user.verified).toBe(true)
	const sent = await request('/notes?/email', alice, { to: 'bob@example.test' })
	expect(sent.status).toBe(200)
	expect(await sent.json()).toMatchObject({ message: 'Message captured below. No email was sent.' })
	const mailbox = (await load(alice)).mail
	expect(mailbox).toHaveLength(2)
	expect(mailbox[0].text).toBe('• A private thought')
	expect((await load(bob)).mail).toEqual([])
	expect((await request('/notes?/email', alice, {})).status).toBe(429)
	const removed = await request('/notes?/remove', alice, { id: own.notes[0].id })
	expect(removed.status).toBe(200)
	expect((await load(alice)).notes).toEqual([])
})
