import { defaults, render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { expect, test } from 'vitest'
import { DataTable } from '../src/data-table'
import { Field } from '../src/field'
import { VirtualList } from '../src/virtual-list'

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
		class: 'table-root',
		columns: [{ label: 'Name', value: 'name' }],
		'data-contract': 'data-table',
		getRowKey: (person: { id: string }) => person.id,
		id: 'people-table',
		label: 'People',
		rows: [{ id: 'ada', name: 'Ada' }],
		search: { placeholder: 'Filter people' },
	}))
	const root = openingTag(html)
	const table = html.match(/<table\b[^>]*>/)?.[0] ?? ''

	expect(root).toMatch(defaultHost)
	expect(root).toContain('class="table-root"')
	expect(root).toContain('data-contract="data-table"')
	expect(root).toContain('id="people-table"')
	expect(root).toContain('data-slot="data-table"')
	expect(root).not.toContain('aria-label=')
	expect(root).not.toMatch(/\s(?:columns|getrowkey|label|rows|search)(?=\s|=|>)/i)
	expect(table).toContain('aria-label="People"')
	expect(table).toContain('data-slot="table"')
	expect(html.match(/data-slot="data-table"/g)).toHaveLength(1)
	expect(html).toContain('data-slot="data-table-container"')
})

test('VirtualList forwards DOM attrs to its single semantic host without leaking behavior args', () => {
	const html = ssr(jsx(VirtualList, {
		'aria-label': 'People',
		class: 'list-root',
		'data-contract': 'virtual-list',
		estimateSize: 40,
		getItemKey: (item: string) => item,
		id: 'people-list',
		items: ['Ada'],
		overscan: 2,
		prerender: 1,
		renderItem: (item: string) => item,
	}))
	const root = openingTag(html)

	expect(root).toMatch(/^<ul\b/)
	expect(root).toContain('aria-label="People"')
	expect(root).toContain('class="list-root"')
	expect(root).toContain('data-contract="virtual-list"')
	expect(root).toContain('id="people-list"')
	expect(root).toContain('data-slot="virtual-list"')
	expect(root).not.toMatch(/\s(?:estimatesize|getitemkey|items|overscan|prerender|renderitem)(?=\s|=|>)/i)
	expect(html.match(/data-slot="virtual-list"/g)).toHaveLength(1)
})
