import * as auth from '@kit/auth'

export default [
	auth.ability('admin:read'),
	auth.when(req => req.method !== 'GET' && req.method !== 'HEAD', auth.ability('admin:write')),
]
