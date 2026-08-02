/** @jsxImportSource ajo */
import { DataTable, type DataTableColumn } from 'ajo-ui/data-table'
import { Field } from 'ajo-ui/field'

type Person = { id: number, name: string }

const people: Person[] = [{ id: 1, name: 'Ada' }]
const columns: readonly DataTableColumn<Person>[] = [{ label: 'Name', value: 'name' }]
const immutableColumn: DataTableColumn<Person> = {
	facet: {
		label: 'Names',
		options: [{ label: 'Ada', value: 'ada' }],
	},
	label: 'Name',
	value: 'name',
}

// @ts-expect-error Immutable schemas cannot change labels in place.
immutableColumn.label = 'Renamed'
// @ts-expect-error Immutable schemas cannot change accessors in place.
immutableColumn.value = 'id'
// @ts-expect-error Immutable schemas cannot change facet metadata in place.
immutableColumn.facet!.label = 'Renamed'
// @ts-expect-error Immutable schemas cannot change facet options in place.
immutableColumn.facet!.options[0]!.label = 'Renamed'

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
