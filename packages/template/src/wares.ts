import type { Middleware } from 'ajo-kit'
import { configure, wares } from 'ajo-kit-auth'
import { db } from './database'
import './mail'

configure(() => db())

export default [wares.session(), wares.csrf] satisfies Middleware[]
