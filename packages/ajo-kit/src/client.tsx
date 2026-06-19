import { render } from 'ajo'
import { current } from 'ajo/context'
import App, { invalidateCache, ssr } from './app'
import type { State, ActionState } from './constants'
import { navigate } from './constants'
import { formArrayFields, formDataBody } from './form'

export { formArrayFields, formDataBody } from './form'

// Action helper for stateful generator components

export function action<T = unknown>(name?: string, init?: RequestInit): ActionState<T> {

	const component = current()

	let controller: AbortController

	const state: ActionState<T> = {
		loading: false,
		data: undefined,
		error: undefined,
		submit: () => { },
		invoke: (body?) => run(body),
		reset: () => {
			state.data = undefined
			state.error = undefined
			component.next()
		}
	}

	const run = async (body: unknown): Promise<T | undefined> => {

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
				body: JSON.stringify(body),
				signal: controller.signal,
				...init,
			})

			const json = await response.json().catch(() => null) as
				| { redirect?: string; topics?: string[]; error?: { status?: number; message?: string; fields?: Record<string, string[] | undefined> }; message?: string; fields?: Record<string, string[] | undefined> }
				| null

			if (!response.ok) {

				state.error = {
					status: json?.error?.status ?? response.status,
					message: json?.error?.message ?? json?.message ?? 'Action failed',
					fields: json?.error?.fields ?? json?.fields
				}

				return
			}

			invalidateCache(json?.topics)

			if (json?.redirect) {
				navigate(json.redirect)
				return
			}

			state.data = (json ?? {}) as T

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
		const body = formDataBody(new FormData(form), formArrayFields(form))
		run(body).then(() => { if (!state.error) form.reset() })
	}

	return state
}

if (!import.meta.env.SSR) {
	const packed = (globalThis as { __SSR__?: string }).__SSR__
	const data = packed ? JSON.parse(packed) as State : null
	if (data) ssr.set(data.url, data)
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
