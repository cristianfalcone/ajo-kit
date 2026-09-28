import type { Middleware } from 'ajo-kit'
import { wares } from 'ajo-kit-auth'
import './mail'

export default [wares.session(), wares.csrf] satisfies Middleware[]
