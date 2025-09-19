import type { Request, Response, NextHandler } from 'polka'

export default function usersWare(_: Request, res: Response, next: NextHandler) {

  res.setHeader('x-ware-users', '1')

  next()
}
