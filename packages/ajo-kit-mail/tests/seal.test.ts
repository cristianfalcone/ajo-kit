import { Buffer } from 'node:buffer'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Refused, type RefusalCode } from '../src/errors'
import {
	domain,
	encode,
	seal,
	type Envelope,
	type Message,
	type Policy,
	type Sealed,
} from '../src/seal'

vi.mock('ajo-kit/platform', async importOriginal => ({
	...await importOriginal<typeof import('ajo-kit/platform')>(),
	randomUUID: () => '00000000-0000-4000-8000-000000000000',
}))

const policy: Policy = {
	from: {
		address: 'sender@example.com',
		name: 'Ajo Mail',
	},
}

const message = (overrides: Partial<Message> = {}): Message => ({
	to: 'recipient@example.com',
	subject: 'Welcome',
	text: 'Hello from Ajo',
	...overrides,
})

const refused = (code: RefusalCode, work: () => unknown) => {
	let error: unknown

	try {
		work()
	} catch (value) {
		error = value
	}

	expect(error).toBeInstanceOf(Refused)
	expect((error as Refused).code).toBe(code)
}

const controls = [
	...Array.from({ length: 32 }, (_, point) => ({
		character: String.fromCodePoint(point),
		point: `U+${point.toString(16).padStart(4, '0').toUpperCase()}`,
	})),
	{ character: '\u007f', point: 'U+007F' },
]

afterEach(() => {
	vi.restoreAllMocks()
})

describe('seal header injection barrier', () => {
	test.each(controls)('refuses $point in to as invalid-recipient', ({ character }) => {
		refused('invalid-recipient', () => seal(message({
			to: `user${character}@example.com`,
		}), policy))
	})

	test.each(controls)('refuses $point in a display name as invalid-name', ({ character }) => {
		refused('invalid-name', () => seal(message({
			to: {
				address: 'recipient@example.com',
				name: `Recipient${character}`,
			},
		}), policy))
	})

	test.each(controls)('refuses $point in subject as invalid-subject', ({ character }) => {
		refused('invalid-subject', () => seal(message({
			subject: `Welcome${character}`,
		}), policy))
	})

	test.each(controls)('refuses $point in kind as invalid-kind', ({ character }) => {
		refused('invalid-kind', () => seal(message({
			kind: `mail${character}`,
		}), policy))
	})

	test.each(controls)('refuses $point in key as invalid-key', ({ character }) => {
		refused('invalid-key', () => seal(message({
			key: `message${character}`,
		}), policy))
	})

	test('refuses the same controlled subject on consecutive validations', () => {
		const bad = message({ subject: 'Welcome\rInjected: true' })

		refused('invalid-subject', () => seal(bad, policy))
		refused('invalid-subject', () => seal(bad, policy))
	})

	test('refuses a controlled configured sender as invalid-sender', () => {
		refused('invalid-sender', () => seal(message(), {
			from: 'sender\r@example.com',
		}))
	})

	test('refuses a controlled reply-to as invalid-recipient', () => {
		refused('invalid-recipient', () => seal(message({
			replyTo: 'reply\n@example.com',
		}), policy))
	})
})

describe('seal mailbox grammar', () => {
	test.each([
		{ label: 'multiple mailboxes', value: 'one@example.com two@example.com' },
		{ label: 'a comma', value: 'one@example.com,two@example.com' },
		{ label: 'angle brackets', value: 'Recipient <recipient@example.com>' },
		{ label: 'a quoted local part', value: '"recipient"@example.com' },
		{ label: 'an IDN domain', value: 'recipient@例え.テスト' },
		{ label: 'an address literal', value: 'recipient@[127.0.0.1]' },
	])('deliberately refuses $label', ({ value }) => {
		refused('invalid-recipient', () => seal(message({ to: value }), policy))
	})

	test('accepts a unicode display name', () => {
		const result = seal(message({
			to: {
				address: 'recipient@example.com',
				name: 'Zoë 測試',
			},
		}), policy)

		expect(result.to.name).toBe('Zoë 測試')
	})

	test('refuses an angle bracket in a display name', () => {
		refused('invalid-name', () => seal(message({
			to: {
				address: 'recipient@example.com',
				name: 'Evil <recipient@example.com>',
			},
		}), policy))
	})

	test('refuses an invalid message sender as invalid-sender', () => {
		refused('invalid-sender', () => seal(message({
			from: 'not-an-address',
		}), policy))
	})

	test('refuses an invalid configured reply-to as invalid-recipient', () => {
		refused('invalid-recipient', () => seal(message(), {
			...policy,
			replyTo: 'not-an-address',
		}))
	})

	test('refuses an empty reply-to instead of treating it as absent', () => {
		refused('invalid-recipient', () => seal(message({
			replyTo: '',
		}), policy))
	})
})

describe('seal UTF-8 byte limits', () => {
	test('refuses an address over 254 bytes despite a shorter code-unit length', () => {
		const address = `${'é'.repeat(122)}@example.com`

		expect(address.length).toBeLessThanOrEqual(254)
		expect(Buffer.byteLength(address, 'utf8')).toBeGreaterThan(254)
		refused('invalid-recipient', () => seal(message({ to: address }), policy))
	})

	test('refuses a subject over 255 bytes despite a shorter code-unit length', () => {
		const subject = '界'.repeat(86)

		expect(subject.length).toBeLessThanOrEqual(255)
		expect(Buffer.byteLength(subject, 'utf8')).toBeGreaterThan(255)
		refused('invalid-subject', () => seal(message({ subject }), policy))
	})

	test('refuses a combined body over 262144 bytes despite a shorter code-unit length', () => {
		const text = '界'.repeat(43_691)
		const html = '界'.repeat(43_691)

		expect(text.length + html.length).toBeLessThanOrEqual(262_144)
		expect(Buffer.byteLength(text, 'utf8') + Buffer.byteLength(html, 'utf8')).toBeGreaterThan(262_144)
		refused('too-large', () => seal(message({ text, html }), policy))
	})

	test('refuses a display name over 128 bytes despite a shorter code-unit length', () => {
		const name = '界'.repeat(43)

		expect(name.length).toBeLessThanOrEqual(128)
		expect(Buffer.byteLength(name, 'utf8')).toBeGreaterThan(128)
		refused('invalid-name', () => seal(message({
			to: {
				address: 'recipient@example.com',
				name,
			},
		}), policy))
	})

	test('accepts subject and combined body values at their byte limits', () => {
		const result = seal(message({
			subject: '界'.repeat(85),
			text: 'a'.repeat(131_072),
			html: 'b'.repeat(131_072),
		}), policy)

		expect(Buffer.byteLength(result.subject, 'utf8')).toBe(255)
		expect(Buffer.byteLength(result.text, 'utf8') + Buffer.byteLength(result.html!, 'utf8')).toBe(262_144)
	})

	test('refuses a policy body limit above the hard maximum', () => {
		refused('invalid-config', () => seal(message(), {
			...policy,
			limit: 262_145,
		}))
	})
})

describe('seal message validation', () => {
	test('refuses an empty subject with its specific code', () => {
		refused('invalid-subject', () => seal(message({ subject: '' }), policy))
	})

	test.each([
		{ label: 'an empty kind', value: '' },
		{ label: 'an uppercase kind', value: 'Reset' },
		{ label: 'a kind over 32 bytes', value: `a${'b'.repeat(32)}` },
	])('refuses $label as invalid-kind', ({ value }) => {
		refused('invalid-kind', () => seal(message({ kind: value }), policy))
	})

	test.each([
		{ label: 'an empty key', value: '' },
		{ label: 'a key with spaces', value: 'reset key' },
		{ label: 'a key over 128 bytes', value: 'k'.repeat(129) },
	])('refuses $label as invalid-key', ({ value }) => {
		refused('invalid-key', () => seal(message({ key: value }), policy))
	})

	test('refuses an empty text and html body', () => {
		refused('empty-body', () => seal(message({ text: '', html: '' }), policy))
	})

	test.each([
		{ label: 'zero timeout', timeout: 0 },
		{ label: 'fractional timeout', timeout: 1.5 },
		{ label: 'oversized timeout', timeout: 2_147_483_648 },
	])('refuses $label as invalid-config', ({ timeout }) => {
		refused('invalid-config', () => seal(message(), {
			...policy,
			timeout,
		}))
	})

	test('refuses a malformed policy sender as invalid-sender', () => {
		refused('invalid-sender', () => seal(message(), {} as Policy))
	})
})

describe('seal deadline and boundary', () => {
	test('refuses an expiry that is already past', () => {
		const now = 1_000_000
		vi.spyOn(Date, 'now').mockReturnValue(now)

		refused('expired', () => seal(message({ expires: now - 1 }), policy))
	})

	test('sets deadline to the minimum of timeout and expiry', () => {
		const now = 1_000_000
		vi.spyOn(Date, 'now').mockReturnValue(now)

		const timeoutWins = seal(message({ expires: now + 20_000 }), {
			...policy,
			timeout: 5_000,
		})
		const expiryWins = seal(message({ expires: now + 2_000 }), {
			...policy,
			timeout: 5_000,
		})

		expect(timeoutWins.deadline).toBe(now + 5_000)
		expect(expiryWins.deadline).toBe(now + 2_000)
	})

	test('returns a frozen envelope with frozen mailbox values', () => {
		const result = seal(message({
			replyTo: {
				address: 'reply@example.com',
				name: 'Reply Desk',
			},
		}), policy)

		expect(Object.isFrozen(result)).toBe(true)
		expect(Object.isFrozen(result.from)).toBe(true)
		expect(Object.isFrozen(result.to)).toBe(true)
		expect(Object.isFrozen(result.replyTo)).toBe(true)
		expect(result.id).toBe('00000000-0000-4000-8000-000000000000')
		expect(result.signal).toBeInstanceOf(AbortSignal)
	})

	test('does not allow an Envelope to construct Sealed outside seal', () => {
		const envelope: Envelope = seal(message(), policy)

		// @ts-expect-error The unexported unique-symbol brand is absent.
		const forged: Sealed = { ...envelope }

		expect(forged).toEqual(envelope)
	})

	test('constructs the envelope from the exact values that were validated', () => {
		const source = message()
		let reads = 0
		Object.defineProperty(source, 'subject', {
			get: () => ++reads === 1 ? 'Welcome' : 'Welcome\rInjected: true',
		})

		const result = seal(source, policy)

		expect(reads).toBe(1)
		expect(result.subject).toBe('Welcome')
	})
})

describe('seal helpers', () => {
	test('returns only the lowercase domain from an address', () => {
		expect(domain('private@EXAMPLE.COM')).toBe('example.com')
	})

	test('folds a long unicode value into bounded RFC 2047 encoded-words', () => {
		const value = '界'.repeat(128)
		const words = encode(value).split('\r\n ')
		const decoded = words
			.map(word => word.slice('=?UTF-8?B?'.length, -2))
			.map(part => Buffer.from(part, 'base64').toString('utf8'))
			.join('')

		expect(words.length).toBeGreaterThan(1)
		expect(words.every(word => Buffer.byteLength(word, 'ascii') <= 75)).toBe(true)
		expect(words.every(word => !word.includes('\uFFFD'))).toBe(true)
		expect(decoded).toBe(value)
	})

	test('preserves the exact RFC 2047 base64 encoding', () => {
		expect(encode('Ajo 🌶️')).toBe('=?UTF-8?B?QWpvIPCfjLbvuI8=?=')
	})
})
