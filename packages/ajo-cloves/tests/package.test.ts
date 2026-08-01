import { expect, test } from 'vitest'
import metadata from '../package.json'

test('the package can be tree-shaken safely', () => {
	expect(metadata.sideEffects).toBe(false)
})
