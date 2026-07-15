/** @jsxImportSource ajo */
import { DataTable, type DataTableColumn } from 'ajo-ui/data-table'
import { Field } from 'ajo-ui/field'
import { DataTable as ThemedDataTable } from 'ajo-ui-playa/data-table'

type Person = { id: number, name: string }

const people: Person[] = [{ id: 1, name: 'Ada' }]
const columns: readonly DataTableColumn<Person>[] = [{ label: 'Name', value: 'name' }]

export const baseFieldForwardsRootAttrs = (
	<Field aria-label="Email field" class="field" data-contract="field" id="email-field">
		Content
	</Field>
)

export const baseDataTableForwardsRootAttrs = (
	<DataTable
		class="table"
		columns={columns}
		data-contract="data-table"
		getRowKey={person => person.id}
		id="people-table"
		label="People"
		rows={people}
	/>
)

export const baseDataTableRejectsUnknownColumns = (
	<DataTable
		columns={[{
			// @ts-expect-error DataTable must correlate value keys with its rows.
			value: 'missing',
			label: 'Missing',
		}]}
		getRowKey={person => person.id}
		label="People"
		rows={people}
	/>
)

export const themedDataTableRejectsUnknownColumns = (
	<ThemedDataTable
		columns={[{
			// @ts-expect-error The themed adapter must preserve base row inference.
			value: 'missing',
			label: 'Missing',
		}]}
		getRowKey={person => person.id}
		label="People"
		rows={people}
	/>
)

export const baseDataTableOwnsChildren = (
	<DataTable
		columns={columns}
		getRowKey={person => person.id}
		label="People"
		rows={people}
		// @ts-expect-error DataTable owns its rendered structure.
		children="Unexpected"
	/>
)

// @ts-expect-error Function accessors require an explicit stable column id.
export const dataTableFunctionAccessorRequiresId: DataTableColumn<Person> = {
	label: 'Uppercase name',
	value: person => person.name.toUpperCase(),
}

export const dataTableControlledSelectionRequiresObserver = (
	<DataTable
		columns={columns}
		getRowKey={person => person.id}
		label="People"
		rows={people}
		// @ts-expect-error Controlled selection must publish every proposed key change.
		selection={{ getRowLabel: person => person.name, value: [1] }}
	/>
)
