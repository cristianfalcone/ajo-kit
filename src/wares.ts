import type { Middleware } from '@kit'
import { configure } from '@kit/auth'
import { session, csrf } from '@kit/auth/wares'
import { when, redirect } from '@kit/auth/guard'
import { db } from '/src/data'

configure(() => db())

export default [

	// function timing(_, res, next) {

	// 	const t0 = Date.now()
	// 	const writeHead = res.writeHead

	// 	res.writeHead = function () {
	// 		res.setHeader('x-response-time', `${Date.now() - t0}ms`)
	// 		return writeHead.apply(this, arguments as any)
	// 	}

	// 	next()
	// },

	session(),

	csrf,

	when(req => req.path === '/', redirect(req => req.user ? '/dashboard' : '/login')),

] satisfies Middleware[]
