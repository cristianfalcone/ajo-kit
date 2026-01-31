import type { Request, Response } from 'polka'
import { db } from '/src/data'
import { sql } from 'kysely'
import { read, clear } from '/src/auth/cookie'
import { remove } from '/src/auth/session'
import { UnauthorizedError } from '../constants'

export const deps = ['users', 'members', 'messages', 'participants', ':user']

const status = async (req: Request) => {

	if (!req.user) throw new UnauthorizedError()

	const [user, unread, roles] = await Promise.all([

		db()
			.selectFrom('users')
			.select(['id', 'name', 'email', 'verified'])
			.where('id', '=', req.user.id)
			.executeTakeFirstOrThrow(),

		db()
			.selectFrom('messages')
			.innerJoin('participants', 'participants.chat', 'messages.chat')
			.where('participants.user', '=', req.user.id)
			.where('messages.user', '!=', req.user.id)
			.where((eb) => eb.or([
				eb('participants.seen', 'is', null),
				eb(sql`datetime(messages.created)`, '>', sql`datetime(participants.seen)`)
			]))
			.select(db().fn.countAll().as('count'))
			.executeTakeFirst()
			.then(row => Number(row?.count ?? 0)),

		db()
			.selectFrom('members')
			.innerJoin('roles', 'roles.id', 'members.role')
			.select(['roles.name'])
			.where('members.user', '=', req.user.id)
			.execute()
			.then(rows => rows.map(r => r.name))
	])

	return { user: { ...user, roles }, unread }
}

export async function layout(req: Request) {
	return status(req)
}

export const events = { status }

export const actions = {
	signout: async (req: Request, res: Response) => {
		const token = read(req)
		if (token) await remove(token)
		clear(res)
		return { redirect: '/login' }
	}
}
