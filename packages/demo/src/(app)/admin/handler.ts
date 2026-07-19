import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { db } from '/src/data'

export async function page(req: Request) {
	req.track?.('admin:stats')

	await auth.session.prune()

	const [users, sessions, tokens] = await Promise.all([
		db().selectFrom('users').select(db().fn.countAll().as('count')).executeTakeFirstOrThrow(),
		db().selectFrom('sessions').select(db().fn.countAll().as('count')).executeTakeFirstOrThrow(),
		db().selectFrom('tokens').select(db().fn.countAll().as('count')).executeTakeFirstOrThrow(),
	])

	return {
		stats: {
			users: Number(users.count),
			sessions: Number(sessions.count),
			tokens: Number(tokens.count),
		}
	}
}
