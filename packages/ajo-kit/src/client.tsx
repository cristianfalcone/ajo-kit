import { render } from 'ajo'
import { current } from 'ajo/context'
import App, { ssr, cache, seals, subscribers } from './app'
import type { State, Entry, ActionState, EventCallback, EventState } from './constants'
import type { Head } from './head'
import { navigate, unpack } from './constants'

// Form action helper for stateful generator components

export function action<T = unknown>(name?: string, init?: RequestInit): ActionState<T> {

	const component = current()

	const state: ActionState<T> = {
		loading: false,
		data: undefined,
		error: undefined,
		handle: () => { },
		reset: () => {
			state.data = undefined
			state.error = undefined
			component.next()
		}
	}

	let controller: AbortController

	state.handle = async (event: SubmitEvent) => {

		event.preventDefault()

		controller?.abort()
		controller = new AbortController()

		const form = event.target as HTMLFormElement
		const body = Object.fromEntries(new FormData(form) as unknown as Iterable<[string, string]>)

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

			const json = unpack(await response.text())

			if (!response.ok) {
				state.error = {
					status: json.error?.status ?? response.status,
					message: json.error?.message ?? json.message ?? 'Action failed',
					fields: json.error?.fields ?? json.fields
				}
			} else if (json.redirect) {
				navigate(json.redirect)
				return
			} else {
				state.data = json as T
				form.reset()
			}

		} catch (error) {

			if (error instanceof Error && error.name === 'AbortError') return

			state.error = {
				status: 500,
				message: error instanceof Error ? error.message : 'Action failed'
			}

		} finally {
			state.loading = false
			component.next()
		}
	}

	return state
}

// Cache invalidation helper

export function invalidate(key?: string) {
	if (key) cache.delete(key)
	else cache.clear()
}

// Event subscription helper

export function subscribe<T = Entry>(name: string, callback: EventCallback<T>) {

	const component = current()

	const wrapped = (state: EventState) => {
		callback(state as EventState<T>)
		component.next()
	}

	if (!subscribers.has(name)) subscribers.set(name, new Set())

	subscribers.get(name)!.add(wrapped)
}

if (!import.meta.env.SSR) {

	type SSR = State & { keys?: string[]; sums?: (string | Record<string, string> | null)[]; es?: Record<string, string | Record<string, string>> }

	const packed = (globalThis as { __SSR__?: string }).__SSR__
	const data = packed ? unpack(packed) as SSR : undefined

	if (data) {

		ssr.set(data.url, data)

		// Populate cache for hash-based navigation optimization

		if (data.keys && data.sums) {

			const values = [data.head, ...data.data] as (Head | Entry)[]

			data.keys.forEach((key, i) => {
				if (values[i] && data.sums![i]) cache.set(key, { value: values[i], sum: data.sums![i]! })
			})
		}

		if (data.es) for (const [name, s] of Object.entries(data.es)) seals.set(name, s)
	}
}

if (import.meta.hot) {

	const HMR = Symbol.for('ajo.hmr')
	const Generator = Symbol.for('ajo.generator')
	const Iterator = Symbol.for('ajo.iterator')
	const Memo = Symbol.for('ajo.memo')

	type HMRElement = Element & {
		[Generator]?: { [HMR]?: string }
		[Iterator]?: unknown
		[Memo]?: unknown
	}

	const clear = (el: HMRElement): void => {
		delete el[Memo]
		Array.from(el.children).forEach(clear)
	}

	const walk = (el: HMRElement, path?: string): void => {

		if (el[Generator]?.[HMR] === path || (!path && el[Generator])) {
			el[Iterator] = null
			delete el[Generator]
			clear(el)
		}

		Array.from(el.children).forEach(child => walk(child, path))
	}

	const root = document.getElementById('root');

	(globalThis as { __HMR__?: (path?: string) => void }).__HMR__ = path => {
		if (root) walk(root, path)
		dispatchEvent(new CustomEvent('hmr'))
	}
}

const root = globalThis?.document?.getElementById('root')

if (root) render(<App />, root)
