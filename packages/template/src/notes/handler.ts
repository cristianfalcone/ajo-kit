import { Failure, Forbidden, Missing, ip, origin, type ActionContext, type Request, type Response } from 'ajo-kit'
import { authorize, confirm, cookie, limit, session, verify } from 'ajo-kit-auth'
import { deliver } from 'ajo-kit-mail'
import { number, object, parse } from 'ajo-kit/validate'
import { db } from '../database'
import { mailbox } from '../mail'
import { text } from '../validation'

const Note = object({ text })
const Identity = object({ id: number() })
const notes = (user: number) => db().selectFrom('notes').select(['id', 'text', 'created'])
	.where('user', '=', user).orderBy('id', 'desc').limit(50).execute()

export async function page(req: Request) {
	authorize(req)
	const { id, name, email, verified } = req.user!
	req.track?.([`notes:${id}`, `mail:${id}`])
	return {
		user: { name, email, verified: verified !== null },
		notes: await notes(id),
		mail: mailbox?.messages.filter(message => message.to.address === email)
			.map(({ id, kind, subject, text }) => ({ id, subject, text, link: kind === 'verify' ? text.match(/https?:\/\/\S+/)?.[0] : undefined })).reverse() ?? null,
	}
}

export const actions = {
	add: async (req: Request, _res: Response, action: ActionContext) => {
		authorize(req)
		const input = parse(Note, req.body)
		await db().insertInto('notes').values({ user: req.user!.id, text: input.text }).execute()
		action.emit(`notes:${req.user!.id}`)
		return { message: 'Note added' }
	},
	remove: async (req: Request, _res: Response, action: ActionContext) => {
		authorize(req)
		const { id } = parse(Identity, req.body)
		if (!Number.isSafeInteger(id) || id < 1) throw new Missing('Note not found')
		const deleted = await db().deleteFrom('notes').where('id', '=', id)
			.where('user', '=', req.user!.id).returning('id').executeTakeFirst()
		if (!deleted) throw new Missing('Note not found')
		action.emit(`notes:${req.user!.id}`)
		return { message: 'Note removed' }
	},
	verify: async (req: Request, _res: Response, action: ActionContext) => {
		authorize(req)
		const { id, email, verified } = req.user!
		if (verified !== null) return { message: 'Your email is already verified.' }
		const recipient = `verify:email:${email}`
		const address = `verify:ip:${ip(req)}`
		if (!limit.check(recipient, 1) || !limit.check(address, 5)) {
			throw new Failure(429, 'Verification is limited to one message per address per hour. Try again later.')
		}
		limit.hit(recipient, 3_600_000)
		limit.hit(address, 3_600_000)
		const result = await deliver({
			to: email,
			kind: 'verify',
			subject: 'Verify your email',
			text: `Verify this address for Ajo Notes: ${verify.url(id, email, origin(req))}\n\nThis link expires in 24 hours. If you did not request it, ignore this message.`,
		})
		if (!result.ok) throw new Failure(503, 'The message could not be delivered. Try again later.')
		action.emit(`mail:${id}`)
		return { message: mailbox ? 'Verification captured below. Open its link to continue.' : 'Check your email for the verification link.' }
	},
	email: async (req: Request, _res: Response, action: ActionContext) => {
		authorize(req)
		const { id, email, verified } = req.user!
		if (verified === null) throw new Forbidden('Verify your email before sending notes.')
		const key = `mail:${id}`
		if (!limit.check(key, 1)) throw new Failure(429, 'Wait a minute before sending again.')
		limit.hit(key)
		const rows = await notes(id)
		const result = await deliver({
			to: email,
			subject: 'Your notes',
			text: rows.length ? rows.map(note => `• ${note.text}`).join('\n') : 'You have no notes yet.',
		})
		if (!result.ok) throw new Failure(503, 'The message could not be delivered. Try again later.')
		action.emit(`mail:${id}`)
		return { message: mailbox ? 'Message captured below. No email was sent.' : 'Your notes were sent.' }
	},
	logout: async (req: Request, res: Response, action: ActionContext) => {
		authorize(req)
		const token = cookie.read(req)
		if (token) await session.remove(token)
		confirm.clear(req)
		cookie.clear(res)
		action.emit([`notes:${req.user!.id}`, `mail:${req.user!.id}`])
		return { redirect: '/login' }
	},
}
