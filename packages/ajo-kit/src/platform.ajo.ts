import app from 'runtime:app'
import { sha256 } from 'runtime:crypto'
import type { Platform } from './platform'

const encoder = new TextEncoder()

export const env: Platform['env'] = name => app.env(name)

export const sha256Hex: Platform['sha256Hex'] = data => sha256(data).toHex()

export const utf8ByteLength: Platform['utf8ByteLength'] = data => encoder.encode(data).byteLength
