import { protect, auth, when } from '/src/auth/guard'
import { api } from '/src/constants'

export default [
	when(api, auth(), protect())
]
