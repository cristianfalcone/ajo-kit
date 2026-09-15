import type { Request } from 'ajo-kit'
import { emit } from 'ajo-kit/server'
import { verify } from 'ajo-kit-auth'

export async function page(req: Request) {
	const user = await verify.validate(req.params.signature)
	if (!user) return { verified: false }
	emit([`notes:${user}`, `mail:${user}`])
	return { verified: true }
}
