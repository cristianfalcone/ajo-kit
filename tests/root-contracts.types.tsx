/** @jsxImportSource ajo */
import { DataTable } from 'ajo-ui/data-table'
import { Field } from 'ajo-ui/field'
import { DataTable as ThemedDataTable, type DataTableArgs as ThemedDataTableArgs } from '../src/ui/data-table'

type Person = { name: string }

const people: Person[] = [{ name: 'Ada' }]

export const baseFieldForwardsRootAttrs = (
	<Field aria-label="Email field" class="field" data-contract="field" id="email-field">
		Content
	</Field>
)

export const baseDataTableForwardsRootAttrs = (
	<DataTable
		aria-label="People"
		class="table"
		columns={[{ accessorKey: 'name', header: 'Name' }]}
		data={[{ name: 'Ada' }]}
		data-contract="data-table"
		id="people-table"
	/>
)

export const baseDataTableRejectsUnknownColumns = (
	<DataTable
		columns={[{
			// @ts-expect-error DataTable must correlate accessorKey with its data rows.
			accessorKey: 'missing',
			header: 'Missing',
		}]}
		data={people}
	/>
)

export const themedDataTableRejectsUnknownColumns = (
	<ThemedDataTable
		columns={[{
			// @ts-expect-error The themed adapter must preserve base row inference.
			accessorKey: 'missing',
			header: 'Missing',
		}]}
		data={people}
	/>
)

export const baseDataTableOwnsChildren = (
	<DataTable
		columns={[{ accessorKey: 'name', header: 'Name' }]}
		data={people}
		// @ts-expect-error DataTable owns its rendered structure.
		children="Unexpected"
	/>
)

export const themedDataTableFixesComposition: ThemedDataTableArgs<Person> = {
	columns: [{ accessorKey: 'name', header: 'Name' }],
	data: people,
	// @ts-expect-error The themed adapter owns its base classes.
	classes: {},
}

export const themedDataTableFixesRenderers: ThemedDataTableArgs<Person> = {
	columns: [{ accessorKey: 'name', header: 'Name' }],
	data: people,
	// @ts-expect-error The themed adapter owns its base renderers.
	renderers: {},
}
