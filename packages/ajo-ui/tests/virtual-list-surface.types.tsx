import { VirtualList, type VirtualListApi } from 'ajo-ui'

type User = {
	id: string
	name: string
}

const users: readonly User[] = [{ id: 'ada', name: 'Ada' }]

export const inferredVirtualList = (
	<VirtualList
		items={users}
		getItemKey={user => user.id}
		estimateSize={user => user.name.length * 4}
		renderItem={(user, index) => `${index}: ${user.name}`}
		setApi={api => api.scrollTo({ key: 'ada' })}
	/>
)

export const stringApi: VirtualListApi<string> = {
	scrollTo: target => typeof target.key === 'string',
}

export const inferredItemShape = (
	<VirtualList
		items={users}
		getItemKey={user => user.id}
		estimateSize={40}
		renderItem={user => {
			// @ts-expect-error Generic inference must preserve the item shape.
			return user.missing
		}}
	/>
)

// @ts-expect-error VirtualList owns the native list role.
export const fixedRole = <VirtualList role="listbox" items={users} getItemKey={user => user.id} estimateSize={40} renderItem={user => user.name} />

// @ts-expect-error VirtualList owns each keyed list item and does not accept children.
export const fixedChildren = <VirtualList items={users} getItemKey={user => user.id} estimateSize={40} renderItem={user => user.name}>Child</VirtualList>
