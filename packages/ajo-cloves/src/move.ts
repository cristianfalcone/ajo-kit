import type { Host } from './core'
import { dom, on } from './core'

type CaptureElement = HTMLElement | SVGElement

type MoveData = {
	/** Client coordinates of the current event. */
	x: number
	y: number
	/** Deltas from the session start. */
	dx: number
	dy: number
	/** True when the session ended via pointercancel, Escape, or capture loss. */
	canceled: boolean
}

type MoveSession = {
	controller: AbortController
	data: MoveData
	element: CaptureElement
	pointer: number
	startX: number
	startY: number
}

type MoveView = {
	/** Begins a drag session from the consumer's own pointerdown. Ignores non-primary buttons. */
	start(event: PointerEvent): boolean
	/** True while a session is running. */
	readonly active: boolean
}

const isCaptureElement = (value: EventTarget | null): value is CaptureElement =>
	value instanceof HTMLElement || value instanceof SVGElement

const capture = (event: PointerEvent) =>
	isCaptureElement(event.currentTarget) ? event.currentTarget
		: isCaptureElement(event.target) ? event.target
			: undefined

const update = (session: MoveSession, event: PointerEvent, canceled: boolean) => {
	const { data } = session

	data.x = event.clientX
	data.y = event.clientY
	data.dx = event.clientX - session.startX
	data.dy = event.clientY - session.startY
	data.canceled = canceled

	return data
}

const release = (session: MoveSession) => {
	try {
		session.element.releasePointerCapture(session.pointer)
	} catch { }
}

/**
 * Pointer-drag session lifecycle: capture, move deltas, and guaranteed cleanup.
 *
 * `data` is one object mutated across callbacks within a session; read it
 * during the callback and do not retain it across events. Consumers own
 * gesture CSS such as `touch-action`, and Escape is reported without
 * preventDefault so consumers can decide that policy.
 *
 * @example
 * ```ts
 * function* Handle(this: Host) {
 * 	const drag = move(this, { onMove(data) { resize(data.dx, data.dy) } })
 * 	yield <div set:onpointerdown={event => drag.start(event)} />
 * }
 * ```
 */
export const move = (host: Host, opts: {
	/** Called once after a drag session starts. */
	onStart?: (data: MoveData, event: PointerEvent) => void
	/** Called for pointer moves during the active session. */
	onMove: (data: MoveData, event: PointerEvent) => void
	/** Called once when the session ends normally or is canceled. */
	onEnd?: (data: MoveData, event: PointerEvent | KeyboardEvent) => void
}): MoveView => {
	if (!dom(host)) {
		return {
			start(_event: PointerEvent) {
				return false
			},
			get active() {
				return false
			},
		}
	}

	const lifetime = host.signal
	let session: MoveSession | undefined

	const finish = (
		current: MoveSession,
		event: PointerEvent | KeyboardEvent,
		canceled: boolean,
		releaseCapture = true,
	) => {
		if (session !== current || current.controller.signal.aborted) return

		const data = event instanceof PointerEvent
			? update(current, event, canceled)
			: current.data

		if (!(event instanceof PointerEvent)) data.canceled = canceled

		session = undefined
		current.controller.abort()
		if (releaseCapture) release(current)
		opts.onEnd?.(data, event)
	}

	return {
		start(event: PointerEvent) {
			if (event.button !== 0 || !event.isPrimary || session || lifetime.aborted) return false

			const element = capture(event)
			if (!element) return false

			try {
				element.setPointerCapture(event.pointerId)
			} catch { }

			const current: MoveSession = {
				controller: new AbortController(),
				data: {
					x: event.clientX,
					y: event.clientY,
					dx: 0,
					dy: 0,
					canceled: false,
				},
				element,
				pointer: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
			}
			const { signal } = current.controller

			session = current

			lifetime.addEventListener('abort', () => {
				if (session !== current || signal.aborted) return

				session = undefined
				current.controller.abort()
				release(current)
			}, { once: true, signal })

			on(element, 'pointermove', next => {
				if (next.pointerId !== current.pointer) return
				opts.onMove(update(current, next, false), next)
			}, host, { signal })

			on(element, 'pointerup', next => {
				if (next.pointerId !== current.pointer) return
				finish(current, next, false)
			}, host, { signal })

			on(element, 'pointercancel', next => {
				if (next.pointerId !== current.pointer) return
				finish(current, next, true)
			}, host, { signal })

			on(element, 'lostpointercapture', next => {
				if (next.pointerId !== current.pointer) return
				finish(current, next, true, false)
			}, host, { signal })

			on(element.ownerDocument, 'keydown', next => {
				if (next.key === 'Escape') finish(current, next, true)
			}, host, { signal })

			opts.onStart?.(current.data, event)
			return true
		},
		get active() {
			return !!session
		},
	}
}
