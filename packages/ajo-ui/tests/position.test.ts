import type { Host } from 'ajo-cloves'
import { expect, test } from 'vitest'
import { position } from '../src/position'

test('position is inert on the server without reading DOM elements', async () => {
	const controller = new AbortController()
	let reads = 0
	const host = { signal: controller.signal } as Host
	const view = position(host, {
		profile: 'popover',
		elements: () => {
			reads++
			throw new Error('server position must not inspect elements')
		},
	})

	expect(await view.start()).toBe(false)
	expect(await view.update()).toBe(false)
	view.stop()
	expect(reads).toBe(0)
})
