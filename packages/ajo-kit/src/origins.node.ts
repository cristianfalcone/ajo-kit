import { readFileSync } from 'node:fs'
import { setOriginReader } from './constants'

setOriginReader((path, options) => {
	const data = readFileSync(path)
	if (data.byteLength > options.maxBytes) throw new RangeError('Origin manifest is too large')
	return data.toString('utf8')
})
