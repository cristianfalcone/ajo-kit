import {
	defaultRangeExtractor,
	elementScroll,
	measureElement,
	observeElementOffset,
	observeElementRect,
	Virtualizer,
	type Range,
	type VirtualItem,
} from '@tanstack/virtual-core'
import { dom, frame, type Host } from 'ajo-cloves'

export type VirtualKey = number | string

export type VirtualInput<Key extends VirtualKey> = {
	estimate: (index: number) => number
	estimateToken: unknown
	keys: readonly Key[]
	overscan: number
	prerender: number
}

export type VirtualRow<Key extends VirtualKey> = Readonly<{
	index: number
	key: Key
	start: number
}>

export type VirtualTarget<Key extends VirtualKey> =
	| { index: number; key?: never }
	| { index?: never; key: Key }

export type VirtualView<Key extends VirtualKey> = {
	readonly connected: boolean
	readonly rows: readonly VirtualRow<Key>[]
	readonly total: number
	measure: (key: Key, node: HTMLElement | null) => void
	scrollTo: (target: VirtualTarget<Key>, align?: 'auto' | 'center' | 'end' | 'start') => boolean
	sync: (input: VirtualInput<Key>) => void
}

type Geometry<Key extends VirtualKey> = {
	rows: ReadonlyArray<VirtualRow<Key> & Pick<VirtualItem, 'size'>>
	total: number
}

const INDEX_ATTRIBUTE = 'data-ajo-virtual-index'
const TARGET_SHAPE_ERROR = 'VirtualList target needs key or index'

const sameGeometry = <Key extends VirtualKey>(left: Geometry<Key>, right: Geometry<Key>) => {
	if (left.total !== right.total || left.rows.length !== right.rows.length) return false
	for (let index = 0; index < left.rows.length; index++) {
		const a = left.rows[index]!
		const b = right.rows[index]!
		if (a.key !== b.key || a.index !== b.index || a.start !== b.start || a.size !== b.size) return false
	}
	return true
}

const validateKeys = <Key extends VirtualKey>(keys: readonly Key[]) => {
	const indexes = new Map<Key, number>()
	for (let index = 0; index < keys.length; index++) {
		const key = keys[index]!
		if (typeof key !== 'string' && (typeof key !== 'number' || !Number.isFinite(key))) {
			throw new TypeError(`VirtualList invalid key at ${index}`)
		}
		const previous = indexes.get(key)
		if (previous !== undefined) {
			throw new TypeError(`VirtualList duplicate key ${JSON.stringify(key)} ${previous}/${index}`)
		}
		indexes.set(key, index)
	}
	return indexes
}

export const virtual = <Key extends VirtualKey>(host: Host): VirtualView<Key> => {
	let input: VirtualInput<Key> | undefined
	let instance: Virtualizer<HTMLElement, HTMLElement> | undefined
	let keyIndexes = new Map<Key, number>()
	let validatedKeys: readonly Key[] | undefined
	let mounted = false
	let live = false
	let mountCleanup: (() => void) | undefined
	let postCommitQueued = false
	let invalidateQueued = false
	let syncing = false
	const positiveSizes = new Map<Key, number>()
	let focusedKey: Key | undefined
	let liveRangeExtractor = defaultRangeExtractor
	const elementsByKey = new Map<Key, HTMLElement>()
	let geometry: Geometry<Key> = { rows: [], total: 0 }
	let rendered = geometry

	const estimate = (index: number) => {
		const size = input!.estimate(index)
		if (!Number.isFinite(size) || size <= 0) {
			throw new RangeError(`VirtualList invalid estimate at ${index}`)
		}
		return size
	}

	let getItemKey = (index: number): Key | number => index

	const collect = (): Geometry<Key> => {
		if (!instance) return { rows: [], total: 0 }
		return {
			rows: instance.getVirtualItems().map(item => ({
				index: item.index,
				key: item.key as Key,
				size: item.size,
				start: item.start,
			})),
			total: instance.getTotalSize(),
		}
	}

	const throwAsync = (error: unknown) => {
		if (!host.signal.aborted) host.throw(error)
	}

	const renderNext = () => {
		if (host.signal.aborted) return
		try {
			host.next()
		} catch (error) {
			throwAsync(error)
		}
	}

	const schedule = frame(renderNext)
	const invalidate = (immediate = false) => {
		if (!immediate) return schedule()
		schedule.cancel()
		if (invalidateQueued || host.signal.aborted) return
		invalidateQueued = true
		queueMicrotask(() => {
			invalidateQueued = false
			renderNext()
		})
	}

	const onChange = () => {
		if (syncing || host.signal.aborted) return
		try {
			const next = collect()
			geometry = next
			if (sameGeometry(next, rendered)) {
				schedule.cancel()
				return
			}
			invalidate()
		} catch (error) {
			throwAsync(error)
		}
	}

	const ssrRangeExtractor = (_range: Range) => {
		const count = Math.min(input!.prerender, input!.keys.length)
		return Array.from({ length: count }, (_, index) => index)
	}

	const refreshLiveRangeExtractor = () => {
		const focusedIndex = focusedKey === undefined ? undefined : keyIndexes.get(focusedKey)
		liveRangeExtractor = (range: Range) => {
			const indexes = defaultRangeExtractor(range)
			if (focusedIndex === undefined || indexes.includes(focusedIndex)) return indexes
			indexes.push(focusedIndex)
			indexes.sort((left, right) => left - right)
			return indexes
		}
	}

	const focusedRowKey = () => {
		if (!dom(host)) return undefined
		let node = host.ownerDocument.activeElement as HTMLElement | null
		while (node && node !== host) {
			const index = node.getAttribute(INDEX_ATTRIBUTE)
			if (index !== null) return input?.keys[Number(index)]
			node = node.parentElement
		}
		return undefined
	}

	const updateFocus = () => {
		const next = focusedRowKey()
		if (next === focusedKey) return
		focusedKey = next
		refreshLiveRangeExtractor()
		if (!live || !instance || host.signal.aborted) return
		try {
			syncing = true
			applyOptions()
			geometry = collect()
		} catch (error) {
			throwAsync(error)
		} finally {
			syncing = false
		}
		if (!sameGeometry(geometry, rendered)) invalidate()
	}

	const measure = (
		node: HTMLElement,
		entry: ResizeObserverEntry | undefined,
		current: Virtualizer<HTMLElement, HTMLElement>,
	) => {
		const index = current.indexFromElement(node)
		const key = input?.keys[index]
		const cached = key === undefined ? undefined : positiveSizes.get(key)
		if (!entry && cached !== undefined) return cached
		const size = measureElement(node, entry, current)
		if (Number.isFinite(size) && size > 0) {
			if (key !== undefined) positiveSizes.set(key, size)
			return size
		}
		return key === undefined ? estimate(index) : positiveSizes.get(key) ?? estimate(index)
	}

	const coreOptions = () => {
		const prerender = Math.min(input!.prerender, input!.keys.length)
		let initialHeight = 0
		for (let index = 0; index < prerender; index++) initialHeight += estimate(index)
		return {
			count: input!.keys.length,
			estimateSize: estimate,
			getItemKey,
			getScrollElement: () => dom(host) ? host as HTMLElement : null,
			indexAttribute: INDEX_ATTRIBUTE,
			initialRect: { height: initialHeight, width: 0 },
			measureElement: measure,
			observeElementOffset,
			observeElementRect,
			onChange,
			overscan: live ? input!.overscan : 0,
			rangeExtractor: live ? liveRangeExtractor : ssrRangeExtractor,
			scrollToFn: elementScroll,
		}
	}

	const applyOptions = () => {
		if (!instance) instance = new Virtualizer<HTMLElement, HTMLElement>(coreOptions())
		else instance.setOptions(coreOptions())
	}

	const postCommit = () => {
		if (postCommitQueued || host.signal.aborted) return
		postCommitQueued = true
		queueMicrotask(() => {
			postCommitQueued = false
			if (host.signal.aborted || !dom(host) || !host.isConnected || !instance) return
			try {
				syncing = true
				const firstMount = !mounted
				if (firstMount) {
					mountCleanup = instance._didMount()
					mounted = true
					focusedKey = focusedRowKey()
					live = true
					refreshLiveRangeExtractor()
					host.addEventListener('focusin', updateFocus, { signal: host.signal })
					host.addEventListener('focusout', () => queueMicrotask(updateFocus), { signal: host.signal })
				}
				applyOptions()
				instance._willUpdate()
				const next = collect()
				const changed = !sameGeometry(next, rendered)
				if (changed) geometry = next
				if (firstMount || changed) invalidate(firstMount)
			} catch (error) {
				throwAsync(error)
			} finally {
				syncing = false
			}
		})
	}

	host.signal.addEventListener('abort', () => {
		schedule.cancel()
		mountCleanup?.()
		mountCleanup = undefined
		mounted = false
		live = false
		focusedKey = undefined
		positiveSizes.clear()
		elementsByKey.clear()
		keyIndexes.clear()
		validatedKeys = undefined
		input = undefined
		instance = undefined
		geometry = rendered = { rows: [], total: 0 }
	}, { once: true })

	return {
		get connected() {
			return mounted && dom(host) && host.isConnected
		},
		get rows() {
			return geometry.rows
		},
		get total() {
			return geometry.total
		},
		measure(key, node) {
			if (!instance) return
			if (!node) {
				instance.measureElement(null)
				const previous = elementsByKey.get(key)
				if (previous) queueMicrotask(() => {
					if (host.signal.aborted || previous.isConnected || elementsByKey.get(key) !== previous) return
					elementsByKey.delete(key)
				})
				return
			}
			const index = keyIndexes.get(key)
			if (index === undefined || host.signal.aborted) return
			elementsByKey.set(key, node)
			node.setAttribute(INDEX_ATTRIBUTE, String(index))
			instance.measureElement(node)
		},
		scrollTo(target, align = 'auto') {
			if (!target || typeof target !== 'object') {
				throw new TypeError(TARGET_SHAPE_ERROR)
			}
			const record = target as { index?: unknown; key?: unknown }
			const hasIndex = Object.hasOwn(record, 'index')
			const hasKey = Object.hasOwn(record, 'key')
			if (hasIndex === hasKey) {
				throw new TypeError(TARGET_SHAPE_ERROR)
			}
			let index: number | undefined
			if (hasKey) {
				if (typeof record.key !== 'string' && (typeof record.key !== 'number' || !Number.isFinite(record.key))) {
					throw new TypeError('VirtualList invalid scroll key')
				}
				index = keyIndexes.get(record.key as Key)
			} else {
				if (typeof record.index !== 'number' || !Number.isInteger(record.index)) {
					throw new TypeError('VirtualList invalid scroll index')
				}
				index = record.index
			}
			if (index === undefined || index < 0 || index >= (input?.keys.length ?? 0)) return false
			if (!instance || !mounted || host.signal.aborted) return false
			instance.scrollToIndex(index, { align, behavior: 'auto' })
			return true
		},
		sync(next) {
			const keysChanged = validatedKeys !== next.keys
			if (keysChanged) {
				const nextIndexes = validateKeys(next.keys)
				if (focusedKey !== undefined && !nextIndexes.has(focusedKey)) {
					const row = elementsByKey.get(focusedKey)
					const active = dom(host) ? host.ownerDocument.activeElement : null
					if (row && active && row.contains(active)) {
						if (dom(host)) host.focus({ preventScroll: true })
					}
					focusedKey = undefined
				}
				for (const key of positiveSizes.keys()) {
					if (!nextIndexes.has(key)) positiveSizes.delete(key)
				}
				if (instance) for (const key of instance.itemSizeCache.keys()) {
					if (!nextIndexes.has(key as Key)) instance.itemSizeCache.delete(key)
				}
				keyIndexes = nextIndexes
				validatedKeys = next.keys
				refreshLiveRangeExtractor()
			}
			if (keysChanged || input?.estimateToken !== next.estimateToken) {
				const currentKeys = next.keys
				getItemKey = index => currentKeys[index] ?? index
			}
			input = next
			syncing = true
			try {
				applyOptions()
				geometry = collect()
				rendered = geometry
			} finally {
				syncing = false
			}
			postCommit()
		},
	}
}
