import { expect, test } from 'vitest'
import { pageInfo, pageRows, paginate } from '../../src/data/pagination'

const req = (originalUrl: string) => ({ originalUrl })

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

test('pageInfo preserves query params in prev and next links', () => {
	const page = paginate(req('/admin/users?page=2&size=10&role=admin'))
	const info = pageInfo(req('/admin/users?page=2&size=10&role=admin'), page, Array.from({ length: 11 }))

	expect(info).toMatchObject({
		page: 2,
		size: 10,
		hasPrev: true,
		hasNext: true,
		prev: '/admin/users?size=10&role=admin',
		next: '/admin/users?page=3&size=10&role=admin',
	})
})

test('pageInfo marks first page without sentinel row as a single page', () => {
	const page = paginate(req('/admin/users?size=10'))
	const info = pageInfo(req('/admin/users?size=10'), page, Array.from({ length: 10 }))

	expect(info).toMatchObject({
		page: 1,
		size: 10,
		hasPrev: false,
		hasNext: false,
	})
	expect(info.prev).toBeUndefined()
	expect(info.next).toBeUndefined()
})

test('pageRows drops the sentinel row', () => {
	const page = paginate(req('/admin/users?size=2'))

	expect(pageRows(page, [1, 2, 3])).toEqual([1, 2])
})
