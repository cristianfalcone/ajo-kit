import { expect, test } from 'vitest'
import { info as build, rows, paginate } from '../../src/data/pagination'

const req = (url: string) => ({ originalUrl: url })

test('paginate defaults invalid page params to the first bounded page', () => {
	const page = paginate(req('/admin/users?page=nope&size=0'))

	expect(page).toEqual({
		page: 1,
		size: 25,
		offset: 0,
	})
})

test('paginate clamps page size and computes offset', () => {
	const page = paginate(req('/admin/users?page=3&size=999'))

	expect(page).toEqual({
		page: 3,
		size: 100,
		offset: 200,
	})
})

test('info preserves query params in prev and next links', () => {
	const page = paginate(req('/admin/users?page=2&size=10&role=admin'))
	const meta = build(req('/admin/users?page=2&size=10&role=admin'), page, Array.from({ length: 11 }))

	expect(meta).toMatchObject({
		page: 2,
		size: 10,
		back: true,
		more: true,
		prev: '/admin/users?size=10&role=admin',
		next: '/admin/users?page=3&size=10&role=admin',
	})
})

test('info marks first page without sentinel row as a single page', () => {
	const page = paginate(req('/admin/users?size=10'))
	const meta = build(req('/admin/users?size=10'), page, Array.from({ length: 10 }))

	expect(meta).toMatchObject({
		page: 1,
		size: 10,
		back: false,
		more: false,
	})
	expect(meta.prev).toBeUndefined()
	expect(meta.next).toBeUndefined()
})

test('rows drops the sentinel row', () => {
	const page = paginate(req('/admin/users?size=2'))

	expect(rows(page, [1, 2, 3])).toEqual([1, 2])
})
