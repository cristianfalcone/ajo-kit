import { describe, expect, test } from 'vitest'
import { strictUtf8Decode } from '../src/bytes'

describe('ajo-kit-auth strict UTF-8', () => {
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
})
