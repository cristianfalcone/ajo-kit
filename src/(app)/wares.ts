import * as auth from '@kit/auth'
import { api } from '@kit'

export default [
	auth.when(api, auth.auth(), auth.protect())
]
