import { domain, type Sealed } from './seal'
import type { Transport } from './index'

/** In-memory transport for tests and development. Refused in production by configure(). */
export interface Capture extends Transport {
	/** Bounded ring: at most `keep` envelopes, oldest dropped. Live reset links do not accumulate. */
	readonly messages: readonly Sealed[]
	/** Returns the newest retained envelope. */
	last(): Sealed | undefined
	/** Returns the first absolute URL in the last text body that matches the optional pattern. */
	link(pattern?: RegExp): string | undefined
	/** Removes retained envelopes. */
	clear(): void
}

/** Settings for an in-memory capture transport. */
export interface CaptureOptions {
	/** Print id, kind and recipient domain only. The body is unreachable from the log path. */
	log?: boolean
	/** Retained envelopes. Default 50. */
	keep?: number
}

const LINKS = /https?:\/\/[^\s<>"'`]+/g

/** Creates a bounded in-memory transport for development and deterministic tests. */
export function capture(options: CaptureOptions = {}): Capture {
	const keep = options.keep ?? 50
	const messages: Sealed[] = []

	const transport = async (mail: Sealed) => {
		messages.push(mail)
		if (messages.length > keep) messages.splice(0, messages.length - keep)

		if (options.log) console.log(`[mail] ${mail.id} ${mail.kind} @${domain(mail.to.address)} sent`)

		return { id: mail.id }
	}

	return Object.assign(transport, {
		dev: true,
		messages,
		last: () => messages.at(-1),
		link: (pattern?: RegExp) => {
			const links = messages.at(-1)?.text.match(LINKS) ?? []
			return pattern ? links.find(value => value.match(pattern)) : links[0]
		},
		clear: () => {
			messages.length = 0
		},
	})
}
