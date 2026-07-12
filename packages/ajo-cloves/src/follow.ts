import type { Host } from './core'
import { clamp, dom, frame } from './core'

type Align = 'start' | 'center' | 'end'

type Point = {
	x: number
	y: number
}

type FollowView = {
	/** Feeds the latest pointer position (client coordinates). Starts the follow loop if idle. */
	move(x: number, y: number): void
	/** Jumps to the pointer immediately, for first-show positioning before paint. */
	snap(x: number, y: number): void
	/** Stops the loop while keeping the last transform. */
	stop(): void
}

const inert: FollowView = {
	move(_x: number, _y: number) { },
	snap(_x: number, _y: number) { },
	stop() { },
}

const copy = (point: Point): Point => ({ x: point.x, y: point.y })

const write = (target: HTMLElement, point: Point) => {
	target.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
}

/** Pointer-anchored floating position: transform-only, rAF-smoothed, and clamped to a container. */
export const follow = (host: Host, opts: {
	/** Floating element. Must be absolutely positioned at its container's padding-box origin. */
	target: () => HTMLElement | null | undefined
	/** Clamp bounds and coordinate space. Default: offsetParent of the target. */
	container?: () => HTMLElement | null | undefined
	/** Gap between the pointer and the target's near edge, in px. Default: 12. */
	offset?: () => number
	/** Smoothing factor per frame in (0, 1]; 1 = instant. Default: 0.35. */
	smooth?: () => number
	/** Vertical alignment of the target relative to the pointer. Default: 'center'. */
	align?: () => Align
}): FollowView => {

	if (!dom(host)) return inert

	const signal = host.signal

	let pointer: Point | undefined
	let current: Point = { x: 0, y: 0 }
	let goal: Point = { x: 0, y: 0 }
	let running = false
	let active: HTMLElement | undefined

	const clear = () => {
		if (active) active.style.willChange = ''
		active = undefined
	}

	const mark = (target: HTMLElement) => {
		if (active && active !== target) active.style.willChange = ''
		active = target
		active.style.willChange = 'transform'
	}

	const measure = (clientX: number, clientY: number) => {

		const target = opts.target()
		const container = opts.container?.() ?? target?.offsetParent

		if (!target || !(container instanceof HTMLElement)) return

		const rect = container.getBoundingClientRect()
		const lx = clientX - rect.left - container.clientLeft
		const ly = clientY - rect.top - container.clientTop
		const offset = opts.offset?.() ?? 12
		const align = opts.align?.() ?? 'center'
		const width = target.offsetWidth
		const height = target.offsetHeight
		const maxX = Math.max(0, container.clientWidth - width)
		const maxY = Math.max(0, container.clientHeight - height)

		let x = lx + offset
		if (x + width > container.clientWidth) x = lx - offset - width
		x = clamp(x, 0, maxX)

		let y = align === 'start'
			? ly + offset
			: align === 'end'
				? ly - offset - height
				: ly - height / 2
		y = clamp(y, 0, maxY)

		return { target, point: { x, y } }
	}

	const stop = () => {
		schedule.cancel()
		running = false
		clear()
	}

	const tick = () => {

		if (!running || signal.aborted || !pointer) return stop()

		const next = measure(pointer.x, pointer.y)

		if (!next) return stop()

		goal = next.point
		mark(next.target)

		const smooth = opts.smooth?.() ?? 0.35

		if (smooth >= 1 || smooth <= 0) {
			current = copy(goal)
		} else {
			current = {
				x: current.x + (goal.x - current.x) * smooth,
				y: current.y + (goal.y - current.y) * smooth,
			}
		}

		if (Math.abs(goal.x - current.x) <= 0.5 && Math.abs(goal.y - current.y) <= 0.5) {
			current = copy(goal)
			write(next.target, current)
			running = false
			clear()
			return
		}

		write(next.target, current)

		schedule()
	}

	const schedule = frame(tick)

	signal.addEventListener('abort', stop, { once: true })

	return {
		move(x: number, y: number) {

			if (signal.aborted) return

			const next = measure(x, y)

			if (!next) return

			pointer = { x, y }
			goal = next.point

			mark(next.target)

			if (running) return

			running = true

			schedule()
		},
		snap(x: number, y: number) {

			if (signal.aborted) return

			const next = measure(x, y)

			if (!next) return

			pointer = { x, y }
			goal = copy(next.point)
			current = copy(next.point)

			schedule.cancel()

			running = false

			clear()
			write(next.target, current)
		},
		stop,
	}
}
