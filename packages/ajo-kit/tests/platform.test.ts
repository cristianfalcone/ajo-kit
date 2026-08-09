import { afterEach, describe, expect, test } from 'vitest'
import { strictUtf8Decode } from '../src/bytes'
import {
	base64UrlDecode,
	base64UrlEncode,
	env,
	hmacSha256Hex,
	randomBase64Url,
	sha256Hex,
	timingSafeEqual,
	utf8ByteLength,
	validatePublicKey,
	verifySignature,
} from '../src/platform.node'

const name = 'AJO_PLATFORM_TEST'
const original = process.env[name]

const payload = Buffer.from('ajo-webauthn-test-payload')
const ec = {
	key: {
		kty: 'EC' as const,
		crv: 'P-256' as const,
		x: 'IYCar314mahOUOhjI_yNp8O94pX1g5NCtfIlDmZPdsM',
		y: '0-nKXnrc7tWrxYMaRYmJHl9rfxE1QrzKx-fMe125koo',
	},
	signature: '30450221009bd9ccf8ed9bca80a15c6665bd936c9c1f09cc67f89065862dbf19b8194ffa720220376921c6820a67c9905a7b376e9da2d5563babe60375014e1208989a5e522e8c',
}
const rsa = {
	key: {
		kty: 'RSA' as const,
		n: 'q0rmSs15dB03LXq4dkUdBLC4f2EKyrEkIl3ASeXn0Sf6-clUE1UbA9Ea4WEY8q19d_sCzaKuObrkp5dZfwxNBt9RYfoNFnroc3wS9A58HqW6s9KIRtwnRhwtOt9-ZiD2WUPCdPbuGHI2rxlsUNhmyTSxrIhTZdGW7sW6Z8zS5Gs8yxsKuSidkDrHJTmpgB8A05Q7rl9zvVixxcrzGbG5h69iGw2g7hEDdfG0601GBc6E1eQkMTJyc4rdzz7wZVAwBKy9nenluD9m_kCiy1aLVtmCvgDfeGeka0sPcnZiPhR24Uc092JTUb08zQ2CdeO0ygkbzsS9fi1QR7M5ZNqCSQ',
		e: 'AQAB',
	},
	signature: 'a0942fcd8771edc329b60e55b3c4192b81615b4e57b821f1d9d8f52ac004909e289d4ab7aa5b7b3b513eaf524e478ab81470ebacfc2433c0fee782fea97bd6c91290d4959c8818c65e8d02f7139d852c899c65f23919cd1885ba270982d778523d8a652e721c0d5f378becab82dd056546a423ebfe83e3cbb676a9140dfdb51022c716bf0706ed634935841a28b5f7a9838d61dee4df74abe0a0ff7f80332dd11178edcdf7d66fc5fb919287d9032354b7970537746d92e904aff5f0ab491c23729fae29eb82a403a41ac18f41d3353d771c3a75708241a720e25de2819df375d3717a4684fa7600722281a6ff39f92a3059c7dcc21b9c80d1622a84dd90902c',
}
const ed = {
	key: {
		kty: 'OKP' as const,
		crv: 'Ed25519' as const,
		x: 'n20H85BKEwUpC2qDFcpX7h3PJHczvWg3Vpj7n2dTyus',
	},
	signature: 'd2c928d7336665d98c0ca5c79b0a109f4d09119c5d774a977042591cd4e1251a53740614eb0d44d0f6854fab2431b7bc4a60ed4fd07c33e4aa31b8017486de05',
}
const vectors = [ec, rsa, ed]

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

	test('strictly decodes every valid UTF-8 width and boundary', () => {
		const valid: Array<[number[], string]> = [
			[[], ''],
			[[0x00, 0x7f], '\u0000\u007f'],
			[[0xc2, 0x80, 0xdf, 0xbf], '\u0080\u07ff'],
			[[0xe0, 0xa0, 0x80, 0xed, 0x9f, 0xbf, 0xee, 0x80, 0x80, 0xef, 0xbf, 0xbf], '\u0800\ud7ff\ue000\uffff'],
			[[0xf0, 0x90, 0x80, 0x80, 0xf4, 0x8f, 0xbf, 0xbf], '\ud800\udc00\udbff\udfff'],
			[[0x41, 0xc2, 0xa2, 0xe2, 0x82, 0xac, 0xf0, 0x90, 0x8d, 0x88], 'A¢€𐍈'],
			[[0xef, 0xbb, 0xbf, 0x61], 'a'],
		]

		for (const [bytes, expected] of valid) {
			expect(strictUtf8Decode(new Uint8Array(bytes))).toBe(expected)
		}
	})

	test('rejects every ill-formed UTF-8 sequence class', () => {
		const invalid = {
			'unexpected continuation': [0x80],
			'illegal leading byte': [0xff],
			'illegal code-point lead': [0xf5, 0x80, 0x80, 0x80],
			'overlong two-byte form': [0xc0, 0x80],
			'overlong three-byte form': [0xe0, 0x9f, 0xbf],
			'overlong four-byte form': [0xf0, 0x8f, 0xbf, 0xbf],
			'surrogate code point': [0xed, 0xa0, 0x80],
			'code point above U+10FFFF': [0xf4, 0x90, 0x80, 0x80],
			'truncated two-byte form': [0xc2],
			'truncated three-byte form': [0xe1, 0x80],
			'truncated four-byte form': [0xf1, 0x80, 0x80],
			'invalid second byte': [0xc2, 0x20],
			'invalid third byte': [0xe1, 0x80, 0x20],
			'invalid fourth byte': [0xf1, 0x80, 0x80, 0x20],
		}

		for (const bytes of Object.values(invalid)) {
			expect(() => strictUtf8Decode(new Uint8Array(bytes))).toThrow(TypeError)
		}
	})

	test('validates and verifies ES256, RS256, and Ed25519 public-key shapes', () => {
		for (const vector of vectors) {
			const signature = Buffer.from(vector.signature, 'hex')
			expect(validatePublicKey(vector.key)).toBe(true)
			expect(verifySignature(vector.key, payload, signature)).toBe(true)

			const changedData = Uint8Array.from(payload)
			changedData[0] ^= 1
			expect(verifySignature(vector.key, changedData, signature)).toBe(false)

			const changedSignature = Uint8Array.from(signature)
			changedSignature[changedSignature.byteLength - 1] ^= 1
			expect(verifySignature(vector.key, payload, changedSignature)).toBe(false)
		}
	})

	test('validates byte fields and refuses off-curve or truncated keys', () => {
		const rawEc = {
			...ec.key,
			x: base64UrlDecode(ec.key.x),
			y: base64UrlDecode(ec.key.y),
		}
		expect(validatePublicKey(rawEc)).toBe(true)

		const offCurve = { ...rawEc, x: rawEc.x.slice() }
		offCurve.x[0] ^= 1
		expect(() => validatePublicKey(offCurve)).toThrow(TypeError)
		expect(() => validatePublicKey({ ...rawEc, x: rawEc.x.slice(1) })).toThrow(TypeError)
		expect(() => validatePublicKey({ ...ed.key, x: base64UrlDecode(ed.key.x).slice(1) })).toThrow(TypeError)
		expect(() => validatePublicKey({ ...rsa.key, n: base64UrlDecode(rsa.key.n).slice(1) })).toThrow(TypeError)

		const der = Buffer.from(ec.signature, 'hex')
		expect(verifySignature(ec.key, payload, der.subarray(0, der.byteLength - 1))).toBe(false)
	})

	test('reads the current environment value', () => {
		delete process.env[name]
		expect(env(name)).toBeUndefined()

		process.env[name] = 'ready'
		expect(env(name)).toBe('ready')
	})
})
