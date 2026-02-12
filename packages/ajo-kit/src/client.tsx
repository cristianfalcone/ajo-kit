import { render } from 'ajo'
import { current } from 'ajo/context'
import App, { ssr, cache, seals, subscribers, snapshots } from './app'
import type { State, Entry, ActionState, EventCallback, EventState } from './constants'
import type { Head } from './head'
import { navigate, unpack } from './constants'

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

			const json = unpack(await response.text())

			if (!response.ok) {

				state.error = {
					status: json.error?.status ?? response.status,
					message: json.error?.message ?? json.message ?? 'Action failed',
					fields: json.error?.fields ?? json.fields
				}

				return
			}

			if (json.redirect) {
				navigate(json.redirect)
				return
			}

			state.data = json as T

			return json as T

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
		const body = Object.fromEntries(new FormData(form) as unknown as Iterable<[string, string]>)
		run(body).then(() => { if (!state.error) form.reset() })
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

	if (!subscribers.has(name)) subscribers.set(name, new Set())

	const set = subscribers.get(name)!

	const wrapped = (state: EventState) => {

		if (!document.contains(component)) {
			set.delete(wrapped)
			return
		}

		callback(state as EventState<T>)

		component.next()
	}

	set.add(wrapped)

	const snapshot = snapshots.get(name)

	if (snapshot) callback(snapshot as EventState<T>)
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
