import type { Request, Response, NextHandler } from 'polka'

export default function(_: Request, res: Response, next: NextHandler) {
  res.setHeader('x-ware-users', '1')
  next()
}
