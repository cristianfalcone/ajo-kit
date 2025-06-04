import { context as clientContext } from 'ajo'
import { context as ssrContext } from 'ajo/html'
import type { QueryClient } from '@tanstack/query-core'

const context = import.meta.env.SSR ? ssrContext : clientContext

export const QueryClientContext = context<QueryClient>()
