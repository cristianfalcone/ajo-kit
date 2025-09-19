import type { Request } from 'polka'

export default {
  get: (req: Request) => ({ id: req.params.id, ok: true }),
}
