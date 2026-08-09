import { afterEach, describe, expect, test } from 'vitest'
import { env, sha256Hex, utf8ByteLength } from '../src/platform.node'

const name = 'AJO_PLATFORM_TEST'
const original = process.env[name]

afterEach(() => {
	if (original === undefined) delete process.env[name]
	else process.env[name] = original
})

describe('ajo-kit Node platform', () => {
	test('returns exact SHA-256 hex vectors', () => {
		expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
		expect(sha256Hex('ajo')).toBe('4a4c489e75c9297e38b4c5ce8a4cde15818601cc658202a6e313c8f9cae50ea4')
		expect(sha256Hex('Ajo 🌶️')).toBe('56f23e08cc6b57818ff34dc98c3b5e07915aa190896beecafa0fd0fd99a08c97')
		expect(sha256Hex(new Uint8Array([0, 1, 255]))).toBe('26a66b061e8f48f39927c312f25293959729eee95978e2892d49d3512a5cc092')
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
