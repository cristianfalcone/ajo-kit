import * as auth from 'ajo-kit-auth'
import { api } from 'ajo-kit'

export default [
	auth.when(api, auth.auth(), auth.protect())
]
