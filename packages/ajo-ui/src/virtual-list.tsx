import {
	defaultRangeExtractor,
	elementScroll,
	measureElement,
	observeElementOffset,
	observeElementRect,
	Virtualizer,
	type Range,
} from '@tanstack/virtual-core'
import type { Children, IntrinsicElements, Stateful } from 'ajo'
import { dom, frame, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { type FixedArgs, type OmitArg, stlx } from './utils'

/** Identity accepted by a VirtualList item. */
export type VirtualListKey = number | string

/** Alignment used when bringing an item into view. */
export type VirtualListScrollOptions = {
	align?: 'center' | 'end' | 'nearest' | 'start'
}

/** Small imperative controller for a mounted VirtualList. */
export type VirtualListApi<Key extends VirtualListKey = VirtualListKey> = {
	/** Brings the current item with this key into view; false means unknown or unavailable. */
	scrollTo(key: Key, options?: VirtualListScrollOptions): boolean
}

/** Arguments for one vertical, data-driven virtual list. */
export type VirtualListArgs<
	T = unknown,
	Key extends VirtualListKey = VirtualListKey,
> = OmitArg<IntrinsicElements['ul'], 'children' | 'role'>
	& FixedArgs<'children' | 'role'>
	& {
		/** Immutable ordered logical collection. */
		items: readonly T[]
		/** Stable unique identity across insert, delete, reorder, and refresh. */
		getItemKey: (item: T, index: number) => Key
		/** Positive initial border-box block size until an item is measured. */
		estimateSize: number | ((item: T, index: number) => number)
		/** Renders content inside the internally owned keyed list item. */
		renderItem: (item: T, index: number) => Children
		/** Extra items before and after the visible range. */
		overscan?: number
		/** Initial items emitted by SSR and the matching first client pass. */
		prerender?: number
		/** Receives one stable mounted-list controller. */
		setApi?: (api: VirtualListApi<Key>) => void
	}

type VirtualListRootArgs<T, Key extends VirtualListKey> = Pick<
	VirtualListArgs<T, Key>,
	'estimateSize' | 'getItemKey' | 'items' | 'overscan' | 'prerender' | 'renderItem' | 'setApi'
>

type Geometry = {
	rows: readonly Readonly<{ index: number; key: VirtualListKey; size: number; start: number }>[]
	total: number
}

const ROOT_STYLE = 'position:relative;overflow-x:hidden;overflow-y:auto;overflow-anchor:none;margin:0;padding:0;list-style:none'
const ITEM_STYLE = 'box-sizing:border-box;left:0;position:absolute;width:100%;top:'
const SIZER_KEY = '\0virtual-list-sizer'
const INDEX_ATTRIBUTE = 'data-ajo-virtual-index'
const EMPTY: Geometry = { rows: [], total: 0 }

const vnodeKey = (key: VirtualListKey) => `\0virtual-list-item:${typeof key}:${key}`

const sameGeometry = (left: Geometry, right: Geometry) => {
	if (left.total !== right.total || left.rows.length !== right.rows.length) return false
	for (let index = 0; index < left.rows.length; index++) {
		const a = left.rows[index]!
		const b = right.rows[index]!
		if (a.key !== b.key || a.index !== b.index || a.start !== b.start || a.size !== b.size) return false
	}
	return true
}

const VirtualListRoot: Stateful<VirtualListRootArgs<any, VirtualListKey>, 'ul'> = function* () {
	let items: readonly unknown[] | undefined
	let keys: VirtualListKey[] = []
	let indexes = new Map<VirtualListKey, number>()
	let estimateSize: VirtualListRootArgs<unknown, VirtualListKey>['estimateSize'] = 0
	let overscan = 0
	let prerender = 0
	let instance: Virtualizer<HTMLElement, HTMLElement> | undefined
	let mounted = false
	let mountCleanup: (() => void) | undefined
	let postCommitQueued = false
	let invalidateQueued = false
	let syncing = false
	let focusedKey: VirtualListKey | undefined
	let liveRangeExtractor = defaultRangeExtractor
	let geometry = EMPTY
	let rendered = EMPTY
	let apiReceiver: VirtualListRootArgs<unknown, VirtualListKey>['setApi']
	const positiveSizes = new Map<VirtualListKey, number>()
	const elementsByKey = new Map<VirtualListKey, HTMLElement>()

	// A new identity makes TanStack rebuild its measurements for new items or estimates.
	let getItemKey = (index: number) => keys[index]!

	const estimate = (index: number) =>
		typeof estimateSize === 'function' ? estimateSize(items![index], index) : estimateSize

	const collect = (): Geometry => instance ? {
		rows: instance.getVirtualItems().map(item => ({
			index: item.index,
			key: item.key as VirtualListKey,
			size: item.size,
			start: item.start,
		})),
		total: instance.getTotalSize(),
	} : EMPTY

	const fail = (error: unknown) => {
		if (!this.signal.aborted) this.throw(error)
	}

	const renderNext = () => {
		if (this.signal.aborted) return
		try {
			this.next()
		} catch (error) {
			fail(error)
		}
	}

	const schedule = frame(renderNext)
	const invalidate = (immediate = false) => {
		if (!immediate) return schedule()
		schedule.cancel()
		if (invalidateQueued || this.signal.aborted) return
		invalidateQueued = true
		queueMicrotask(() => {
			invalidateQueued = false
			renderNext()
		})
	}

	const onChange = () => {
		if (syncing || this.signal.aborted) return
		try {
			geometry = collect()
			if (sameGeometry(geometry, rendered)) schedule.cancel()
			else invalidate()
		} catch (error) {
			fail(error)
		}
	}

	const ssrRangeExtractor = (_range: Range) =>
		Array.from({ length: Math.min(prerender, keys.length) }, (_, index) => index)

	// The focused row stays in the live range, so scrolling never unmounts focus.
	const refreshLiveRangeExtractor = () => {
		const focusedIndex = focusedKey === undefined ? undefined : indexes.get(focusedKey)
		liveRangeExtractor = (range: Range) => {
			const next = defaultRangeExtractor(range)
			if (focusedIndex === undefined || next.includes(focusedIndex)) return next
			next.push(focusedIndex)
			next.sort((left, right) => left - right)
			return next
		}
	}

	const focusedRowKey = () => {
		if (!dom(this)) return undefined
		let node = this.ownerDocument.activeElement as HTMLElement | null
		while (node && node !== this) {
			const index = node.getAttribute(INDEX_ATTRIBUTE)
			if (index !== null) return keys[Number(index)]
			node = node.parentElement
		}
		return undefined
	}

	// An item that measures zero keeps its key's last positive size.
	const measureSize = (
		node: HTMLElement,
		entry: ResizeObserverEntry | undefined,
		current: Virtualizer<HTMLElement, HTMLElement>,
	) => {
		const index = current.indexFromElement(node)
		const key = keys[index]
		const cached = key === undefined ? undefined : positiveSizes.get(key)
		if (!entry && cached !== undefined) return cached
		const size = measureElement(node, entry, current)
		if (Number.isFinite(size) && size > 0) {
			if (key !== undefined) positiveSizes.set(key, size)
			return size
		}
		return cached ?? estimate(index)
	}

	const coreOptions = () => {
		const count = Math.min(prerender, keys.length)
		let initialHeight = 0
		for (let index = 0; index < count; index++) initialHeight += estimate(index)
		return {
			count: keys.length,
			estimateSize: estimate,
			getItemKey,
			getScrollElement: () => dom(this) ? this as HTMLElement : null,
			indexAttribute: INDEX_ATTRIBUTE,
			initialRect: { height: initialHeight, width: 0 },
			measureElement: measureSize,
			observeElementOffset,
			observeElementRect,
			onChange,
			overscan: mounted ? overscan : 0,
			rangeExtractor: mounted ? liveRangeExtractor : ssrRangeExtractor,
			scrollToFn: elementScroll,
		}
	}

	const applyOptions = () => {
		if (!instance) instance = new Virtualizer<HTMLElement, HTMLElement>(coreOptions())
		else instance.setOptions(coreOptions())
	}

	const updateFocus = () => {
		const next = focusedRowKey()
		if (next === focusedKey) return
		focusedKey = next
		refreshLiveRangeExtractor()
		if (this.signal.aborted) return
		try {
			syncing = true
			applyOptions()
			geometry = collect()
		} catch (error) {
			fail(error)
		} finally {
			syncing = false
		}
		if (!sameGeometry(geometry, rendered)) invalidate()
	}

	// The first commit in a connected document replaces the SSR window with the live range.
	const postCommit = () => {
		if (postCommitQueued || this.signal.aborted) return
		postCommitQueued = true
		queueMicrotask(() => {
			postCommitQueued = false
			if (this.signal.aborted || !dom(this) || !this.isConnected || !instance) return
			try {
				syncing = true
				const firstMount = !mounted
				if (firstMount) {
					mountCleanup = instance._didMount()
					mounted = true
					focusedKey = focusedRowKey()
					refreshLiveRangeExtractor()
					this.addEventListener('focusin', updateFocus, { signal: this.signal })
					this.addEventListener('focusout', () => queueMicrotask(updateFocus), { signal: this.signal })
				}
				applyOptions()
				instance._willUpdate()
				const next = collect()
				const changed = !sameGeometry(next, rendered)
				if (changed) geometry = next
				if (firstMount || changed) invalidate(firstMount)
			} catch (error) {
				fail(error)
			} finally {
				syncing = false
			}
		})
	}

	const measure = (key: VirtualListKey, node: HTMLElement | null) => {
		if (this.signal.aborted || !instance) return
		if (!node) {
			instance.measureElement(null)
			const previous = elementsByKey.get(key)
			if (previous) queueMicrotask(() => {
				if (this.signal.aborted || previous.isConnected || elementsByKey.get(key) !== previous) return
				elementsByKey.delete(key)
			})
			return
		}
		const index = indexes.get(key)
		if (index === undefined) return
		elementsByKey.set(key, node)
		node.setAttribute(INDEX_ATTRIBUTE, String(index))
		instance.measureElement(node)
	}

	const api: VirtualListApi<VirtualListKey> = {
		scrollTo: (key, options) => {
			const index = indexes.get(key)
			if (index === undefined || !mounted || this.signal.aborted) return false
			const align = options?.align
			instance!.scrollToIndex(index, { align: !align || align === 'nearest' ? 'auto' : align, behavior: 'auto' })
			return true
		},
	}

	this.signal.addEventListener('abort', () => {
		schedule.cancel()
		mountCleanup?.()
	}, { once: true })

	for (const args of this) {
		overscan = args.overscan ?? 4
		prerender = args.prerender ?? 20
		const itemsChanged = args.items !== items
		if (itemsChanged) {
			const next = new Map<VirtualListKey, number>()
			const nextKeys = args.items.map((item, index) => {
				const key = args.getItemKey(item, index)
				const previous = next.get(key)
				if (previous !== undefined) throw new TypeError(`VirtualList duplicate key ${JSON.stringify(key)} ${previous}/${index}`)
				next.set(key, index)
				return key
			})
			if (focusedKey !== undefined && !next.has(focusedKey)) {
				// The focused row is leaving, so focus moves to the list before its node goes.
				const row = elementsByKey.get(focusedKey)
				const active = dom(this) ? this.ownerDocument.activeElement : null
				if (row && active && row.contains(active)) this.focus({ preventScroll: true })
				focusedKey = undefined
			}
			for (const key of positiveSizes.keys()) {
				if (!next.has(key)) positiveSizes.delete(key)
			}
			if (instance) for (const key of instance.itemSizeCache.keys()) {
				if (!next.has(key as VirtualListKey)) instance.itemSizeCache.delete(key)
			}
			items = args.items
			keys = nextKeys
			indexes = next
			refreshLiveRangeExtractor()
		}
		if (itemsChanged || args.estimateSize !== estimateSize) {
			estimateSize = args.estimateSize
			getItemKey = index => keys[index]!
		}
		syncing = true
		try {
			applyOptions()
			geometry = rendered = collect()
		} finally {
			syncing = false
		}
		postCommit()
		if (mounted && this.isConnected && args.setApi && args.setApi !== apiReceiver) {
			apiReceiver = args.setApi
			args.setApi(api)
		}
		yield (
			<>
				{geometry.rows.map(({ index, key, start }) => (
					<li
						aria-posinset={index + 1}
						aria-setsize={keys.length}
						data-slot="virtual-list-item"
						key={vnodeKey(key)}
						ref={element => measure(key, element)}
						style={`${ITEM_STYLE}${start}px`}
					>
						{args.renderItem(args.items[index], index)}
					</li>
				))}
				<li
					aria-hidden="true"
					data-slot="virtual-list-sizer"
					key={SIZER_KEY}
					role="none"
					style={`height:${geometry.total}px;pointer-events:none;visibility:hidden`}
				/>
			</>
		)
	}
}

VirtualListRoot.is = 'ul'

/** Virtualized native list with stable identity and bounded DOM work. */
const VirtualList = <T, Key extends VirtualListKey = VirtualListKey>({
	estimateSize,
	getItemKey,
	items,
	overscan,
	prerender,
	renderItem,
	setApi,
	style,
	tabindex = 0,
	...attrs
}: VirtualListArgs<T, Key>) => (
	<VirtualListRoot
		{...rootAttrs(attrs as Record<string, unknown>)}
		estimateSize={estimateSize}
		getItemKey={getItemKey}
		items={items}
		overscan={overscan}
		prerender={prerender}
		renderItem={renderItem}
		setApi={setApi}
		attr:data-slot="virtual-list"
		attr:style={stlx(style, ROOT_STYLE)}
		attr:tabindex={tabindex}
	/>
)

export { VirtualList }
