import * as auth from '@kit/auth'
import type { ActionContext, Request, Response } from '@kit'
import { Failure, origin } from '@kit'
import { send } from '@kit/mail'
import { object, optional, string } from '@kit/validate'
import { parse } from '@kit/validate'
import { db, email, trimmed } from '/src/data'
import { info, paginate, rows as trim } from '/src/data/pagination'
import * as registration from '/src/data/registration'
import type { Signup } from '/src/data/registration'

const Mode = object({ signup: string() })
const Invite = object({ email, name: optional(trimmed, '') })
const Revoke = object({ id: string() })

const signup = (value: string): Signup => {
	if (value === 'open' || value === 'invite') return value

	throw new Failure(400, 'Invalid signup mode')
}

export async function page(req: Request) {
	req.track?.('admin:registration')

	const pagination = paginate(req, 20, 50)
	const listed = await auth.invite.list()
	const invitations = listed.slice(pagination.offset, pagination.offset + pagination.size + 1)
	const ids = [...new Set(invitations.flatMap(row => row.inviter === null ? [] : [row.inviter]))]
	const users = ids.length ? await db()
		.selectFrom('users')
		.select(['id', 'name', 'email'])
		.where('id', 'in', ids)
		.execute() : []
	const inviters = new Map(users.map(user => [user.id, user]))

	return {
		signup: await registration.policy(),
		invitations: trim(pagination, invitations).map(row => ({
			...row,
			inviterName: row.inviter === null ? null : inviters.get(row.inviter)?.name ?? null,
			inviterEmail: row.inviter === null ? null : inviters.get(row.inviter)?.email ?? null,
			status: 'pending' as const,
		})),
		page: info(req, pagination, invitations),
	}
}

export const actions = {

	mode: async (req: Request, _res: Response, action: ActionContext) => {
		auth.authorize(req, 'admin:write')

		const input = parse(Mode, req.body)
		await registration.set(signup(input.signup), req.user!.id)
		action.emit(['admin:registration', 'registration:policy'])

		return { saved: true }
	},

	invite: async (req: Request, _res: Response, action: ActionContext) => {
		auth.authorize(req, 'admin:write')

		const input = parse(Invite, req.body)
		const user = req.user!
		const inviter = `invite:admin:${user.id}`
		const invited = `invite:email:${input.email}`

		if (!auth.limit.check(inviter, 10) || !auth.limit.check(invited, 3)) {
			throw new Failure(429, 'Too many invitation attempts. Try again later.')
		}

		auth.limit.hit(inviter)
		auth.limit.hit(invited, 60 * 60 * 1000)

		const token = await auth.invite.create({
			role: 'user',
			email: input.email,
			name: input.name,
			inviter: user.id,
		})
		const base = origin(req)
		const link = new URL(`/register/${token}`, base).toString()
		const name = typeof user.name === 'string' && user.name.trim()
			? user.name
			: 'An administrator'

		await send({
			to: input.email,
			subject: 'You are invited to Ajo Kit',
			text: `${name} invited you to create an account at ${base}.\n\nAccept the invitation: ${link}\n\nThis invitation expires in 7 days. If you were not expecting this email, you can ignore it.`,
		})

		action.emit('admin:registration')

		return { invited: true }
	},

	revoke: async (req: Request, _res: Response, action: ActionContext) => {
		auth.authorize(req, 'admin:write')

		const input = parse(Revoke, req.body)
		await auth.invite.revoke(input.id)
		action.emit('admin:registration')

		return { revoked: true }
	},
}
