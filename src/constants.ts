import { context } from 'ajo/context'
import type { QueryClient } from '@tanstack/query-core'

export const QueryClientContext = context<QueryClient>()
