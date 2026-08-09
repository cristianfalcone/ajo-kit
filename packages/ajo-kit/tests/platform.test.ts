import { afterEach, describe, expect, test } from 'vitest'
import {
	base64UrlDecode,
	base64UrlEncode,
	env,
	hmacSha256Hex,
	randomBase64Url,
	sha256Hex,
	timingSafeEqual,
	utf8ByteLength,
} from '../src/platform.node'

const name = 'AJO_PLATFORM_TEST'
const original = process.env[name]

afterEach(() => {
	if (original === undefined) delete process.env[name]
	else process.env[name] = original
})

describe('ajo-kit Node platform', () => {
	test('encodes and strictly decodes canonical unpadded base64url', () => {
		expect(base64UrlEncode('Ajo 🌶️')).toBe('QWpvIPCfjLbvuI8')
		expect(base64UrlEncode(new Uint8Array([0, 1, 2, 253, 254, 255]))).toBe('AAEC_f7_')
		expect(base64UrlDecode('AAEC_f7_')).toEqual(new Uint8Array([0, 1, 2, 253, 254, 255]))

		for (const invalid of ['A', 'AB', 'AA==', 'AA+', 'AA/', 'AA\n', ' AA']) {
			expect(() => base64UrlDecode(invalid)).toThrow(SyntaxError)
		}
	})

	test('returns exact HMAC-SHA-256 hex vectors', () => {
		expect(hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog')).toBe(
			'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8'
		)
	})

	test('generates canonical base64url credentials at the requested byte length', () => {
		const credential = randomBase64Url(32)

		expect(credential).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(base64UrlDecode(credential)).toHaveLength(32)
	})

	test('returns exact SHA-256 hex vectors', () => {
		expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
		expect(sha256Hex('ajo')).toBe('4a4c489e75c9297e38b4c5ce8a4cde15818601cc658202a6e313c8f9cae50ea4')
		expect(sha256Hex('Ajo 🌶️')).toBe('56f23e08cc6b57818ff34dc98c3b5e07915aa190896beecafa0fd0fd99a08c97')
		expect(sha256Hex(new Uint8Array([0, 1, 255]))).toBe('26a66b061e8f48f39927c312f25293959729eee95978e2892d49d3512a5cc092')
	})

	test('compares byte arrays without accepting length or content differences', () => {
		expect(timingSafeEqual(new Uint8Array(), new Uint8Array())).toBe(true)
		expect(timingSafeEqual(new Uint8Array([0, 1, 2]), new Uint8Array([0, 1, 2]))).toBe(true)
		expect(timingSafeEqual(new Uint8Array([0, 1, 2]), new Uint8Array([0, 1, 3]))).toBe(false)
		expect(timingSafeEqual(new Uint8Array([0, 1]), new Uint8Array([0, 1, 0]))).toBe(false)
	})

	test('counts UTF-8 bytes for ASCII, multibyte, and surrogate input', () => {
		expect(utf8ByteLength('ajo')).toBe(3)
		expect(utf8ByteLength('ájo')).toBe(4)
		expect(utf8ByteLength('🌶️')).toBe(7)
		expect(utf8ByteLength('😀')).toBe(4)
		expect(utf8ByteLength('\ud800')).toBe(3)
	})

	test('reads the current environment value', () => {
		delete process.env[name]
		expect(env(name)).toBeUndefined()

		process.env[name] = 'ready'
		expect(env(name)).toBe('ready')
	})
})
