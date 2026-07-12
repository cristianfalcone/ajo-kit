import { expect, test, type Page } from '@playwright/test'
import { goto } from './helpers'

type WaterWindow = typeof globalThis & {
	__waterDraws: number
	__waterFrames: FrameRequestCallback[]
	__setWaterMotion: (reduced: boolean) => void
}

const fakeWebGL = (page: Page, reducedMotion = false) => page.addInitScript(({ reducedMotion }) => {
	const scope = globalThis as WaterWindow
	scope.__waterDraws = 0
	const nativeMatchMedia = globalThis.matchMedia.bind(globalThis)
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	const query = '(prefers-reduced-motion: reduce)'
	let reduced = reducedMotion
	const motion = {
		get matches() { return reduced },
		media: query,
		onchange: null as ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null,
		addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void, options?: AddEventListenerOptions) {
			listeners.add(listener)
			options?.signal?.addEventListener('abort', () => listeners.delete(listener), { once: true })
		},
		removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
			listeners.delete(listener)
		},
	}
	globalThis.matchMedia = value => value === query
		? motion as unknown as MediaQueryList
		: nativeMatchMedia(value)
	scope.__setWaterMotion = next => {
		if (next === reduced) return
		reduced = next
		const event = { matches: reduced, media: query } as MediaQueryListEvent
		for (const listener of listeners) listener.call(motion, event)
		motion.onchange?.call(motion as unknown as MediaQueryList, event)
	}

	const gl = {
		ARRAY_BUFFER: 0x8892,
		CLAMP_TO_EDGE: 0x812f,
		COLOR_ATTACHMENT0: 0x8ce0,
		COLOR_BUFFER_BIT: 0x4000,
		FLOAT: 0x1406,
		FRAGMENT_SHADER: 0x8b30,
		FRAMEBUFFER: 0x8d40,
		FRAMEBUFFER_COMPLETE: 0x8cd5,
		LINEAR: 0x2601,
		LINK_STATUS: 0x8b82,
		NEAREST: 0x2600,
		RGBA: 0x1908,
		STATIC_DRAW: 0x88e4,
		TEXTURE_2D: 0x0de1,
		TEXTURE_MAG_FILTER: 0x2800,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		TRIANGLES: 0x0004,
		UNSIGNED_BYTE: 0x1401,
		VERTEX_SHADER: 0x8b31,
		attachShader() {},
		bindBuffer() {},
		bindFramebuffer() {},
		bindTexture() {},
		bufferData() {},
		checkFramebufferStatus() { return 0x8cd5 },
		clear() {},
		clearColor() {},
		compileShader() {},
		createBuffer() { return {} },
		createFramebuffer() { return {} },
		createProgram() { return {} },
		createShader() { return {} },
		createTexture() { return {} },
		drawArrays() { scope.__waterDraws++ },
		enableVertexAttribArray() {},
		framebufferTexture2D() {},
		getAttribLocation() { return 0 },
		getExtension(name: string) {
			if (name === 'OES_texture_half_float') return { HALF_FLOAT_OES: 0x8d61 }
			if (name === 'OES_texture_half_float_linear') return {}
			if (name === 'WEBGL_lose_context') return { loseContext() {} }
			return null
		},
		getProgramParameter() { return true },
		getUniformLocation() { return {} },
		linkProgram() {},
		shaderSource() {},
		texImage2D() {},
		texParameteri() {},
		uniform1f() {},
		uniform2f() {},
		uniform3fv() {},
		useProgram() {},
		vertexAttribPointer() {},
		viewport() {},
	}

	const getContext = HTMLCanvasElement.prototype.getContext
	Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
		configurable: true,
		value(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
			if (type === 'webgl') return gl
			return getContext.call(this, type, ...args)
		},
	})
}, { reducedMotion })

const point = async (page: Page) => {
	const heading = page.getByRole('heading', { name: 'Sign In' })
	const box = await heading.boundingBox()
	if (!box) throw new Error('Login heading has no pointer geometry')
	return { heading, x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const pointer = (pointerId: number, x: number, y: number, options: {
	button?: number
	buttons?: number
	isPrimary?: boolean
} = {}) => ({
	bubbles: true,
	button: options.button ?? 0,
	buttons: options.buttons ?? 1,
	clientX: x,
	clientY: y,
	isPrimary: options.isPrimary ?? true,
	pointerId,
})

const release = (page: Page, pointerId: number, x: number, y: number) => page.evaluate(
	({ pointerId, x, y }) => window.dispatchEvent(new PointerEvent('pointerup', {
		bubbles: true,
		button: 0,
		buttons: 0,
		clientX: x,
		clientY: y,
		isPrimary: true,
		pointerId,
	})),
	{ pointerId, x, y },
)

const captureFrames = (page: Page) => page.evaluate(() => {
	const scope = globalThis as WaterWindow
	scope.__waterFrames = []
	globalThis.requestAnimationFrame = callback => {
		scope.__waterFrames.push(callback)
		return scope.__waterFrames.length
	}
	globalThis.cancelAnimationFrame = () => {}
})

const flushFrame = (page: Page) => page.evaluate(() => {
	const scope = globalThis as WaterWindow
	const before = scope.__waterDraws
	for (let attempt = 0; attempt < 20 && scope.__waterDraws === before; attempt++) {
		const frame = scope.__waterFrames.shift()
		if (!frame) return -1
		frame(performance.now())
	}
	return scope.__waterDraws - before
})

test('water interaction preserves text selection', async ({ page }) => {
	await fakeWebGL(page)
	await goto(page, '/login')

	const { heading, x, y } = await point(page)
	await heading.evaluate(element => {
		const range = document.createRange()
		range.selectNodeContents(element)
		const selection = getSelection()!
		selection.removeAllRanges()
		selection.addRange(range)
	})

	await heading.dispatchEvent('pointerdown', pointer(1, x, y))
	await page.evaluate(
		({ x, y }) => window.dispatchEvent(new PointerEvent('pointermove', {
			bubbles: true,
			button: 0,
			buttons: 1,
			clientX: x + 20,
			clientY: y,
			isPrimary: true,
			pointerId: 1,
		})),
		{ x, y },
	)

	expect(await page.evaluate(() => getSelection()?.toString())).toBe('Sign In')
	expect(await page.evaluate(() => document.documentElement.style.userSelect)).not.toBe('none')
	await release(page, 1, x + 20, y)
})

test('reduced motion and secondary pointers do not queue water splats', async ({ page }) => {
	await fakeWebGL(page, true)
	await goto(page, '/login')
	await captureFrames(page)

	const { heading, x, y } = await point(page)
	for (let pointerId = 1; pointerId <= 6; pointerId++) {
		await heading.dispatchEvent('pointerdown', pointer(pointerId, x, y))
		await release(page, pointerId, x, y)
	}

	await page.evaluate(() => (globalThis as WaterWindow).__setWaterMotion(false))
	await page.waitForFunction(() => (globalThis as WaterWindow).__waterFrames.length > 0)
	expect(await flushFrame(page)).toBe(3)

	await heading.dispatchEvent('pointerdown', pointer(20, x, y, { button: 2, buttons: 2 }))
	await release(page, 20, x, y)
	expect(await flushFrame(page)).toBe(3)

	await heading.dispatchEvent('pointerdown', pointer(21, x, y, { isPrimary: false }))
	await release(page, 21, x, y)
	expect(await flushFrame(page)).toBe(3)
})
