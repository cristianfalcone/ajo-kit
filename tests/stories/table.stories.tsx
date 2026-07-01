/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Table, { Tbody, Td, Th, Thead, Tr, type Column } from '/src/ui/table'

type User = {
	id: number
	email: string
	name: string
	role: string
	sessions: number
}

const rows: User[] = [
	{ id: 1, name: 'Cristian Falcone', email: 'cristian@example.com', role: 'admin', sessions: 4 },
	{ id: 2, name: 'Emily Stone', email: 'emily@example.com', role: 'user', sessions: 2 },
	{ id: 3, name: 'Test User', email: 'test@example.com', role: 'user', sessions: 0 },
]

const columns: Column<User>[] = [
	{ header: 'Name', key: 'name', cell: user => user.name, tone: 'body' },
	{ header: 'Email', key: 'email', cell: user => user.email, tone: 'code' },
	{ header: 'Role', key: 'role', cell: user => user.role, tone: 'muted' },
	{ header: 'Sessions', key: 'sessions', align: 'right', cell: user => user.sessions },
]

export default {
	title: 'UI/Table',
	component: Table,
	parameters: {
		docs: { description: 'Shared table elements and generated row renderer.' },
	},
} satisfies Meta<typeof Table>

export const Generated: Story<typeof Table> = {
	render: () => <Table rows={rows} columns={columns} getKey={user => user.id} />,
}

export const Manual: Story<typeof Table> = {
	render: () => (
		<Table>
			<Thead>
				<tr>
					<Th>Token</Th>
					<Th align="right">Days left</Th>
				</tr>
			</Thead>
			<Tbody>
				<Tr>
					<Td tone="code">seed-api-token</Td>
					<Td align="right">90</Td>
				</Tr>
				<Tr>
					<Td tone="code">support-token</Td>
					<Td align="right">14</Td>
				</Tr>
			</Tbody>
		</Table>
	),
}

export const EmptyRows: Story<typeof Table> = {
	render: () => <Table rows={[]} columns={columns} />,
}
