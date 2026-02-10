import { protect, auth, when } from '@kit/auth/guard'
import { api } from '@kit'

export default [
	when(api, auth(), protect())
]
