import send from '@polka/send'
import type { Middleware } from 'polka'

export default {
  get: (req, res) => send(res, 200, { id: req.params.id, ok: true }),
} satisfies Record<string, Middleware>
