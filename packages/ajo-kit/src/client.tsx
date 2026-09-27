import { render } from 'ajo'
import { current } from 'ajo/context'
import App, { boot, init } from './app'
import type { State, Action } from './constants'
import { navigate } from './constants'
import { invalidate } from './cache'

/** Converts form values into JSON fields; repeated names and multiple selects stay arrays. */
const fields = (form: HTMLFormElement) => {

	const seen = new Set<string>()
	const arrays = new Set<string>()

	for (const element of Array.from(form.elements)) {

		const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		const name = control.name

		if (!name) continue

		if (seen.has(name) || control instanceof HTMLSelectElement && control.multiple) arrays.add(name)
		else seen.add(name)
	}

	const body: Record<string, string | string[]> = {}

	for (const [name, value] of new FormData(form)) {

		if (typeof value !== 'string') continue

		const current = body[name]

		if (current === undefined) body[name] = arrays.has(name) ? [value] : value
		else if (Array.isArray(current)) current.push(value)
		else body[name] = [current, value]
	}

	return body
}

/** Creates state and submit/invoke helpers for a route action in a stateful generator component. */
export function action<T = unknown>(name?: string, init?: RequestInit): Action<T> {

	const component = current()

	if (!component) throw new Error('action() must be called inside a stateful component.')

	let controller: AbortController | undefined

	const state: Action<T> = {
		loading: false,
		data: undefined,
		error: undefined,
		submit: () => { },
		invoke: (value?) => run(value),
		reset: () => {
			const current = controller

			controller = undefined
			current?.abort()
			state.loading = false
			state.data = undefined
			state.error = undefined
			component.next()
		}
	}

	const run = async (value: unknown): Promise<T | undefined> => {

		controller?.abort()
		const current = controller = new AbortController()

		const forwardAbort = (signal?: AbortSignal | null) => {
			if (!signal) return
			if (signal.aborted) current.abort(signal.reason)
			else signal.addEventListener('abort', () => current.abort(signal.reason), { once: true, signal: current.signal })
		}

		forwardAbort(component.signal)
		forwardAbort(init?.signal)

		state.loading = true
		state.error = undefined
		component.next()

		try {

			const response = await fetch(name ? `?/${name}` : '', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify(value),
				...init,
				signal: current.signal,
			})

			const json = await response.json().catch(() => null) as
				| { redirect?: string; topics?: string[]; versions?: Record<string, number>; error?: { status?: number; message?: string; fields?: Record<string, string[] | undefined> } }
				| null

			if (controller !== current || current.signal.aborted) return

			if (!response.ok) {

				state.error = {
					status: json?.error?.status ?? response.status,
					message: json?.error?.message ?? 'Action failed',
					fields: json?.error?.fields
				}

				return
			}

			invalidate(json?.topics)

			if (json?.redirect) {
				navigate(json.redirect)
				return
			}

			state.data = (json ?? {}) as T
			globalThis.dispatchEvent?.(new CustomEvent('ajo:action', { detail: json ?? {} }))

			return state.data

		} catch (error) {

			if (current.signal.aborted || error instanceof Error && error.name === 'AbortError') return

			if (controller !== current) return

			state.error = {
				status: 500,
				message: error instanceof Error ? error.message : 'Action failed'
			}

			return

		} finally {
			if (controller === current) {
				controller = undefined
				state.loading = false
				component.next()
			}
		}
	}

	state.submit = (event: SubmitEvent) => {
		event.preventDefault()
		const form = event.target as HTMLFormElement
		run(fields(form)).then(() => { if (!state.error) form.reset() })
	}

	return state
}

if (!import.meta.env.SSR) {
	const script = globalThis.document?.getElementById('__SSR__')
	const data = script?.textContent ? JSON.parse(script.textContent) as State : null
	init(data)
}

if (import.meta.hot) {

	const HMR = Symbol.for('ajo.hmr')
	const Generator = Symbol.for('ajo.generator')
	const Iterator = Symbol.for('ajo.iterator')
	const Memo = Symbol.for('ajo.memo')

	type HMRElement = Element & {
		[Generator]?: { [HMR]?: string } | null
		[Iterator]?: unknown
		[Memo]?: unknown
	}

	const walk = (el: HMRElement, path?: string): void => {
		if (el[Generator]?.[HMR] == path) el[Iterator] = el[Generator] = null
		el[Memo] = null
		Array.from(el.children).forEach(child => walk(child, path))
	}

	const root = document.getElementById('root');

	(globalThis as { __HMR__?: (path?: string) => void }).__HMR__ = path => {
		if (root) walk(root, path)
		dispatchEvent(new CustomEvent('hmr'))
	}
}

const root = globalThis?.document?.getElementById('root')

// Ready means a mounted route. A failed route import leaves the server DOM in place and the app not ready.
if (root) boot(location.pathname + location.search).then(({ page, state }) => {
	render(<App page={page} state={state} />, root)
	document.documentElement.dataset.ajoReady = 'true'
}, console.error)
