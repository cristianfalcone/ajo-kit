/** @jsxImportSource ajo */
import { DataTable } from 'ajo-ui-playa/data-table'

type Person = { id: number, name: string }
const people: Person[] = [{ id: 1, name: 'Ada' }]

export const themedDataTableRejectsUnknownColumns = (
	<DataTable
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
