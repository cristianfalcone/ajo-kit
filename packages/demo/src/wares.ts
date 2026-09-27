import * as auth from 'ajo-kit-auth'
import type { Middleware } from 'ajo-kit'
import { db } from '/src/data'
import '/src/mail'

auth.configure(() => db())

export default [
	auth.wares.session(),

	auth.wares.csrf,

	auth.when(req => req.path === '/', auth.redirect(req => req.user ? '/dashboard' : '/login')),

] satisfies Middleware[]
