import { createHash } from 'node:crypto'
import type { Platform } from './platform'

export const env: Platform['env'] = name =>
	typeof process === 'undefined' ? undefined : process.env[name]

export const sha256Hex: Platform['sha256Hex'] = data =>
	createHash('sha256').update(data).digest('hex')

export const utf8ByteLength: Platform['utf8ByteLength'] = data =>
	Buffer.byteLength(data)
