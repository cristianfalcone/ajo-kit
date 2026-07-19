import * as auth from '@kit/auth'
import type { Middleware } from '@kit'
import { db } from '/src/data'

auth.configure(() => db())

export default [
	auth.wares.session(),

	auth.wares.csrf,

	auth.when(req => req.path === '/', auth.redirect(req => req.user ? '/dashboard' : '/login')),

] satisfies Middleware[]
