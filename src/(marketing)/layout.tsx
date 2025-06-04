import { QueryClientContext } from '../constants'
import { QueryClient } from '@tanstack/query-core'
import type { Children, Stateful } from 'ajo'

type Args = {
  children: Children
}

export default (function* (args) {

	const client = QueryClientContext(new QueryClient())

  client.setDefaultOptions({ queries: { enabled: !import.meta.env.SSR } })

  while (true) yield (
    <>
      <div class="bg-blue-600 p-4 text-white text-2xl">
        Marketing Layout
      </div>
      {args.children}
    </>
  )
}) as Stateful<Args>
