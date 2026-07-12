import { defaults, render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { DataTable } from '../../packages/ajo-ui/src/data-table'
import { Field } from '../../packages/ajo-ui/src/field'

const openingTag = (html: string) => html.match(/^<[^>]+>/)?.[0] ?? ''
const defaultHost = new RegExp(`^<${defaults.tag}\\b`)

test('Field forwards DOM attrs to its public Stateful host without leaking behavior args', () => {
	const html = ssr(jsx(Field, {
		'aria-label': 'Email field',
		children: 'Content',
		class: 'field-root',
		'data-contract': 'field',
		id: 'email-field',
		invalid: true,
		name: 'email',
	}))
	const root = openingTag(html)

	expect(root).toMatch(defaultHost)
	expect(root).toContain('aria-label="Email field"')
	expect(root).toContain('class="field-root"')
	expect(root).toContain('data-contract="field"')
	expect(root).toContain('id="email-field"')
	expect(root).toContain('data-slot="field"')
	expect(root).not.toMatch(/\s(?:invalid|name)=/)
	expect(html).toContain(`>Content</${defaults.tag}>`)
})

test('DataTable forwards DOM attrs to its single public Stateful host', () => {
	const html = ssr(jsx(DataTable, {
		'aria-label': 'People',
		class: 'table-root',
		columns: [{ accessorKey: 'name', header: 'Name' }],
		data: [{ name: 'Ada' }],
		'data-contract': 'data-table',
		id: 'people-table',
		search: { placeholder: 'Filter people' },
		columnVisibility: true,
	}))
	const root = openingTag(html)

	expect(root).toMatch(defaultHost)
	expect(root).toContain('aria-label="People"')
	expect(root).toContain('class="table-root"')
	expect(root).toContain('data-contract="data-table"')
	expect(root).toContain('id="people-table"')
	expect(root).toContain('data-slot="data-table"')
	expect(root).not.toMatch(/\s(?:columns|columnvisibility|data|search)(?=\s|=|>)/i)
	expect(html.match(/data-slot="data-table"/g)).toHaveLength(1)
	expect(html).toContain('data-slot="data-table-container"')
})
