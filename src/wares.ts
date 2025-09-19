import type { Request, Response, NextHandler } from 'polka'

export default [

  function timing(_: Request, res: Response, next: NextHandler) {

    const t0 = Date.now()

    const writeHead = res.writeHead

    res.writeHead = function () {

      res.setHeader('x-response-time', `${Date.now() - t0}ms`)

      return writeHead.apply(this, arguments as any)
    }

    next()
  },
]
