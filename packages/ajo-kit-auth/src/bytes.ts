/** Joins byte arrays without exposing a host-specific buffer type. */
export const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
	const length = parts.reduce((total, part) => total + part.byteLength, 0)
	const joined = new Uint8Array(length)
	let offset = 0

	for (const part of parts) {
		joined.set(part, offset)
		offset += part.byteLength
	}

	return joined
}

const invalid = (): never => { throw new TypeError('Invalid UTF-8') }
const continuation = (byte: number | undefined) =>
	byte !== undefined && byte >= 0x80 && byte <= 0xbf

/** Decodes UTF-8 after rejecting every ill-formed byte sequence. */
export const strictUtf8Decode = (bytes: Uint8Array): string => {
	let at = 0

	while (at < bytes.byteLength) {
		const first = bytes[at++]!
		if (first <= 0x7f) continue

		if (first >= 0xc2 && first <= 0xdf) {
			if (!continuation(bytes[at])) invalid()
			at += 1
			continue
		}

		if (first >= 0xe0 && first <= 0xef) {
			const second = bytes[at]
			const third = bytes[at + 1]
			if (!continuation(second) || !continuation(third)) invalid()
			if (first === 0xe0 && second! < 0xa0) invalid()
			if (first === 0xed && second! > 0x9f) invalid()
			at += 2
			continue
		}

		if (first >= 0xf0 && first <= 0xf4) {
			const second = bytes[at]
			if (!continuation(second) || !continuation(bytes[at + 1]) || !continuation(bytes[at + 2])) invalid()
			if (first === 0xf0 && second! < 0x90) invalid()
			if (first === 0xf4 && second! > 0x8f) invalid()
			at += 3
			continue
		}

		invalid()
	}

	// The normal decoder cannot replace anything after the complete validator
	// above succeeds, and unlike fatal mode this constructor exists on both hosts.
	return new TextDecoder().decode(bytes)
}
