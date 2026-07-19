import { afterEach, describe, expect, test } from 'vitest'
import { finish, header, start, type Result } from '../src/timing'

const timing = process.env.AJO_TIMING

afterEach(() => {
	if (timing === undefined) delete process.env.AJO_TIMING
	else process.env.AJO_TIMING = timing
})

describe('ajo-kit timing', () => {
	test('timing flag honors disabled values and formats Server-Timing', () => {
		process.env.AJO_TIMING = '0'
		expect(start()).toBeUndefined()

		process.env.AJO_TIMING = '1'
		expect(start()).toMatchObject({ start: expect.any(Number) })

		const result: Result = {
			start: 0,
			total: 12.3,
			loader: 4.5,
			render: 6.7,
			status: 200,
			bytes: 123,
		}

		expect(header(result)).toBe('total;dur=12.3, loader;dur=4.5, render;dur=6.7')
		expect(finish(undefined, { status: 304, bytes: 0 })).toBeUndefined()
	})
})
