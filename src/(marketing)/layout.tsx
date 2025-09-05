import clsx from 'clsx'
import { QueryClient } from '@tanstack/query-core'
import type { Children, Stateful } from 'ajo'
import { QueryClientContext } from '../constants'

type Args = { children: Children }

const Layout: Stateful<Args, 'section'> = function* (args) {

  const client = QueryClientContext(new QueryClient())

  client.setDefaultOptions({ queries: { enabled: !import.meta.env.SSR } })

  while (true) {

    const path = typeof location !== 'undefined' ? location.pathname : ''

    yield (
      <>
        <nav class="flex items-center gap-3 text-[11px] font-medium text-indigo-600/70 dark:text-indigo-200/70">
          <span class="uppercase tracking-wider text-indigo-700/70 dark:text-indigo-300/70">Marketing</span>
          <span class="opacity-30">/</span>
          {[
            ['About', '/about'],
            ['Blog', '/blog'],
          ].map(([label, href]) => {

            const active = path.startsWith(href)

            return (
              <a
                href={href}
                class={clsx([
                  'px-2 py-1 rounded-md transition ring-1 ring-transparent',
                  active
                    ? 'bg-indigo-600/10 text-indigo-700 ring-indigo-500/30 dark:bg-indigo-500/25 dark:text-indigo-100 dark:ring-indigo-400/40'
                    : 'text-indigo-600/70 hover:bg-indigo-600/10 dark:text-indigo-200/70 dark:hover:bg-white/10'
                ])}
              >
                {label}
              </a>
            )
          })}
        </nav>
        {args.children}
      </>
    )
  }
}

Layout.is = 'section'
Layout.attrs = { class: 'pt-6 space-y-10' }

export default Layout
