import { render } from 'ajo'
import { current } from 'ajo/context'
import App, { init } from './app'
import type { State, Action } from './constants'
import { navigate } from './constants'
import { fields, body as make } from './form'
import { parse } from './ssr'
import { invalidate } from './cache'

// Action helper for stateful generator components

export function action<T = unknown>(name?: string, init?: RequestInit): Action<T> {

	const component = current()

	let controller: AbortController

	const state: Action<T> = {
		loading: false,
		data: undefined,
		error: undefined,
		submit: () => { },
		invoke: (value?) => run(value),
		reset: () => {
			state.data = undefined
			state.error = undefined
			component.next()
		}
	}

	const run = async (value: unknown): Promise<T | undefined> => {

		controller?.abort()
		controller = new AbortController()

		state.loading = true
		state.error = undefined
		component.next()

		try {

			const response = await fetch(name ? `?/${name}` : '', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify(value),
				signal: controller.signal,
				...init,
			})

			const json = await response.json().catch(() => null) as
				| { redirect?: string; topics?: string[]; versions?: Record<string, number>; error?: { status?: number; message?: string; fields?: Record<string, string[] | undefined> }; message?: string; fields?: Record<string, string[] | undefined> }
				| null

			if (!response.ok) {

				state.error = {
					status: json?.error?.status ?? response.status,
					message: json?.error?.message ?? json?.message ?? 'Action failed',
					fields: json?.error?.fields ?? json?.fields
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

			if (error instanceof Error && error.name === 'AbortError') return

			state.error = {
				status: 500,
				message: error instanceof Error ? error.message : 'Action failed'
			}

			return

		} finally {
			state.loading = false
			component.next()
		}
	}

	state.submit = (event: SubmitEvent) => {
		event.preventDefault()
		const form = event.target as HTMLFormElement
		const data = make(new FormData(form), fields(form))
		run(data).then(() => { if (!state.error) form.reset() })
	}

	return state
}

if (!import.meta.env.SSR) {
	const script = globalThis.document?.getElementById('__SSR__')
	const data = script?.textContent ? parse<State>(script.textContent) : null
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

if (root) {
	render(<App />, root)
	document.documentElement.dataset.ajoReady = 'true'
}
