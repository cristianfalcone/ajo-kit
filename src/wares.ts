import type { Middleware } from '@kit'
import { configure } from '@kit/auth'
import { session, csrf } from '@kit/auth/wares'
import { when, redirect } from '@kit/auth/guard'
import { db } from '/src/data'

configure(() => db())

export default [
	session(),

	csrf,

	when(req => req.path === '/', redirect(req => req.user ? '/dashboard' : '/login')),

] satisfies Middleware[]
