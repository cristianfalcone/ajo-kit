import type { Children, IntrinsicElements, Stateful } from 'ajo'
import { statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import type { FixedArgs, OmitArg } from './utils'
import { stlx } from './utils'
import { virtual } from './virtual'

/** Identity accepted by a VirtualList item. */
export type VirtualListKey = number | string

/** Alignment used when bringing an item into view. */
export type VirtualListScrollOptions = {
	align?: 'center' | 'end' | 'nearest' | 'start'
}

/** Current item addressed by exactly one logical coordinate. */
export type VirtualListTarget<Key extends VirtualListKey = VirtualListKey> =
	| { index: number; key?: never }
	| { index?: never; key: Key }

/** Small imperative controller for a mounted VirtualList. */
export type VirtualListApi<Key extends VirtualListKey = VirtualListKey> = {
	/** Brings one current source item into view; false means unavailable. */
	scrollTo(
		target: VirtualListTarget<Key>,
		options?: VirtualListScrollOptions,
	): boolean
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

const ROOT_STYLE = 'position:relative;overflow-x:hidden;overflow-y:auto;overflow-anchor:none;margin:0;padding:0;list-style:none'
const ITEM_STYLE = 'box-sizing:border-box;left:0;position:absolute;width:100%;top:'
const SIZER_KEY = '\0virtual-list-sizer'
const SNAPSHOT_ERROR = 'VirtualList mutated items'
const unavailableScroll: VirtualListApi['scrollTo'] = () => false

const vnodeKey = (key: VirtualListKey) => `\0virtual-list-item:${typeof key}:${key}`

const estimate = <T,>(value: VirtualListArgs<T>['estimateSize'], item: T, index: number) =>
	typeof value === 'function' ? value(item, index) : value

const assertCountOption = (name: 'overscan' | 'prerender', value: number) => {
	if (!Number.isInteger(value) || value < 0) {
		throw new RangeError(`VirtualList invalid ${name}`)
	}
}

const VirtualListRoot: Stateful<VirtualListRootArgs<any, VirtualListKey>, 'ul'> = function* () {
	const geometry = virtual<VirtualListKey>(this)
	let source: readonly unknown[] | undefined
	let sourceLength = 0
	let keys: readonly VirtualListKey[] = []
	let apiReceiver: VirtualListRootArgs<unknown, VirtualListKey>['setApi']
	let estimateInput: unknown
	let estimateItems: readonly unknown[] | undefined
	let estimateToken: object | undefined

	const snapshotKeys = (
		items: readonly unknown[],
		getItemKey: (item: unknown, index: number) => VirtualListKey,
	) => {
		if (items !== source) {
			source = items
			sourceLength = items.length
			const next = items.map(getItemKey)
			if (next.length === keys.length && next.every((key, index) => key === keys[index])) return keys
			keys = next
			return keys
		}
		if (items.length !== sourceLength) {
			throw new TypeError(SNAPSHOT_ERROR)
		}
		if (items.length > 0) {
			const last = items.length - 1
			if (getItemKey(items[0], 0) !== keys[0] || getItemKey(items[last], last) !== keys[last]) {
				throw new TypeError(SNAPSHOT_ERROR)
			}
		}
		return keys
	}

	const api: VirtualListApi<VirtualListKey> = {
		scrollTo: (target, options) => geometry.scrollTo(
			target,
			options?.align === 'nearest' ? 'auto' : options?.align,
		),
	}
	this.signal.addEventListener('abort', () => {
		api.scrollTo = unavailableScroll
		source = undefined
		keys = []
		apiReceiver = undefined
	}, { once: true })

	for (const {
		estimateSize,
		getItemKey,
		items,
		overscan = 4,
		prerender = 20,
		renderItem,
		setApi,
	} of this) {
		assertCountOption('overscan', overscan)
		assertCountOption('prerender', prerender)
		if (estimateSize !== estimateInput || (typeof estimateSize === 'function' && items !== estimateItems)) {
			estimateInput = estimateSize
			estimateItems = items
			estimateToken = {}
		}
		geometry.sync({
			estimate: index => estimate(estimateSize, items[index], index),
			estimateToken,
			keys: snapshotKeys(items, getItemKey),
			overscan,
			prerender,
		})
		if (geometry.connected && setApi && setApi !== apiReceiver) {
			apiReceiver = setApi
			setApi(api)
		}
		yield (
			<>
				{geometry.rows.map(({ index, key, start }) => (
					<li
						aria-posinset={index + 1}
						aria-setsize={items.length}
						data-slot="virtual-list-item"
						key={vnodeKey(key)}
						ref={element => geometry.measure(key, element)}
						style={`${ITEM_STYLE}${start}px`}
					>
						{renderItem(items[index], index)}
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
export default VirtualList
