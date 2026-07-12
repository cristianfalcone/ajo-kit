// @vitest-environment happy-dom
import type { Host } from 'ajo'
import type { Action } from 'ajo-kit'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const abort = () => Object.assign(new Error('aborted'), { name: 'AbortError' })
const cache = '../src/cache'
const module = '../src/app'
let unmount = () => { }

const need = <T,>(value: T | null | undefined): T => {
	if (value == null) throw new Error('missing value')
	return value
}

const json = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
	status: 200,
	headers: { 'Content-Type': 'application/json' },
	...init,
})

const load = async () => {
	const invalidate = vi.fn()

	vi.doMock(module, () => ({ default: () => null, init: vi.fn() }))
	vi.doMock(cache, () => ({ invalidate }))

	const [{ render }, { jsx }, client] = await Promise.all([
		import('ajo'),
		import('ajo/jsx-runtime'),
		import('../src/client'),
	])

	unmount = () => render(null, document.body)
	return { ...client, invalidate, jsx, render }
}

beforeEach(() => {
	if (!globalThis.MutationObserver) globalThis.MutationObserver = window.MutationObserver
	document.body.textContent = ''
})

afterEach(() => {
	unmount()
	unmount = () => { }
	vi.unstubAllGlobals()
	vi.doUnmock(cache)
	vi.doUnmock(module)
	vi.resetModules()
	document.body.textContent = ''
})

test('action aborts the active request when its component unmounts', async () => {
	const signals: AbortSignal[] = []
	let save: Action<{ ok: true }> | undefined
	let host: Host | null = null
	const { action, jsx, render } = await load()

	vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
		const signal = init?.signal as AbortSignal | undefined

		if (!signal) throw new Error('missing signal')

		signals.push(signal)

		return new Promise<Response>((_resolve, reject) => {
			signal.addEventListener('abort', () => reject(abort()), { once: true })
		})
	}))

	function* Form(this: Host) {
		save = action<{ ok: true }>('save')

		while (true) yield jsx('button', { children: 'save' })
	}

	render(jsx(Form, { ref: (element: unknown) => host = element as Host | null }), document.body)

	const mounted = need<Host>(host)
	const result = need(save).invoke({ ok: true })

	expect(signals).toHaveLength(1)
	expect(signals[0].aborted).toBe(false)

	mounted.return()

	expect(signals[0].aborted).toBe(true)
	await expect(result).resolves.toBeUndefined()
})

test('action reset aborts the active request and lets the next invoke own state', async () => {
	type Result = { ok: true; value: string; topics?: string[] }
	type Request = {
		signal: AbortSignal
		resolve: (response: Response) => void
		reject: (error: unknown) => void
	}

	const requests: Request[] = []
	const events: unknown[] = []
	const listener = (event: Event) => events.push((event as CustomEvent).detail)
	let save: Action<Result> | undefined
	const { action, invalidate, jsx, render } = await load()

	vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
		const signal = init?.signal as AbortSignal | undefined

		if (!signal) throw new Error('missing signal')

		return new Promise<Response>((resolve, reject) => {
			requests.push({ signal, resolve, reject })
			signal.addEventListener('abort', () => reject(abort()), { once: true })
		})
	}))

	function* Form() {
		save = action<Result>('save')

		while (true) yield jsx('button', { children: 'save' })
	}

	globalThis.addEventListener('ajo:action', listener)

	try {
		render(jsx(Form, {}), document.body)

		const form = need(save)
		const first = form.invoke({ value: 'old' })

		expect(requests).toHaveLength(1)
		expect(form.loading).toBe(true)

		form.reset()

		expect(requests[0].signal.aborted).toBe(true)
		expect(form.loading).toBe(false)
		expect(form.data).toBeUndefined()
		expect(form.error).toBeUndefined()

		const second = form.invoke({ value: 'new' })

		expect(requests).toHaveLength(2)
		expect(requests[1].signal.aborted).toBe(false)
		expect(form.loading).toBe(true)

		await Promise.resolve()

		expect(form.loading).toBe(true)
		expect(form.data).toBeUndefined()
		expect(form.error).toBeUndefined()

		requests[0].resolve(json({ ok: true, value: 'old', topics: ['old'] }))
		requests[1].resolve(json({ ok: true, value: 'new', topics: ['new'] }))

		await expect(first).resolves.toBeUndefined()
		await expect(second).resolves.toEqual({ ok: true, value: 'new', topics: ['new'] })

		expect(form.loading).toBe(false)
		expect(form.data).toEqual({ ok: true, value: 'new', topics: ['new'] })
		expect(form.error).toBeUndefined()
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith(['new'])
		expect(events).toEqual([{ ok: true, value: 'new', topics: ['new'] }])
	} finally {
		globalThis.removeEventListener('ajo:action', listener)
	}
})

test('action composes caller signals without surrendering lifecycle abort ownership', async () => {
	type Request = { input: string; signal: AbortSignal }

	const requests: Request[] = []
	const external = new AbortController()
	const resetExternal = new AbortController()
	let externallyCancelled: Action<unknown> | undefined
	let internallyCancelled: Action<unknown> | undefined
	const { action, jsx, render } = await load()

	vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		const signal = init?.signal as AbortSignal | undefined

		if (!signal) throw new Error('missing signal')

		requests.push({ input: String(input), signal })

		return new Promise<Response>((_resolve, reject) => {
			signal.addEventListener('abort', () => reject(abort()), { once: true })
		})
	}))

	function* Form() {
		externallyCancelled = action('external', { signal: external.signal })
		internallyCancelled = action('internal', { signal: resetExternal.signal })

		while (true) yield jsx('button', { children: 'save' })
	}

	render(jsx(Form, {}), document.body)

	const externalResult = need(externallyCancelled).invoke()
	const internalResult = need(internallyCancelled).invoke()

	expect(requests).toHaveLength(2)
	expect(requests[0].signal).not.toBe(external.signal)
	expect(requests[1].signal).not.toBe(resetExternal.signal)

	external.abort()
	need(internallyCancelled).reset()

	const resetWasRelayed = requests[1].signal.aborted
	const callerSignalStayedActive = !resetExternal.signal.aborted

	resetExternal.abort()

	expect(requests[0].signal.aborted).toBe(true)
	expect(resetWasRelayed).toBe(true)
	expect(callerSignalStayedActive).toBe(true)
	await expect(externalResult).resolves.toBeUndefined()
	await expect(internalResult).resolves.toBeUndefined()
})
