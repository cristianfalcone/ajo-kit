import type { Middleware } from 'polka'

export default ((_, res, next) => {
  res.setHeader('x-ware-users', '1')
  next()
}) satisfies Middleware
