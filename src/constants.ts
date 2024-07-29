import { context } from 'ajo'
import type { QueryClient } from '@tanstack/query-core'

export const QueryClientContext = context<QueryClient>()
