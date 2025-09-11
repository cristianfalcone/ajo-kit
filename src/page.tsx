import clsx from 'clsx'

const actions = [
  {
    href: '/about',
    label: 'About',
    icon: 'i-lucide-info',
    primary: true,
  },
  {
    href: 'https://github.com/cristianfalcone/ajo-kit',
    label: 'GitHub',
    icon: 'i-lucide-code-2',
  },
]

const features = [
  {
    href: '/blog',
    label: 'Blog Demo',
    desc: 'Example articles',
    icon: 'i-lucide-newspaper'
  },
  {
    href: '/products',
    label: 'Shop Demo',
    desc: 'Example products & cart flow',
    icon: 'i-lucide-shopping-bag'
  },
]

export default () => (
  <>
    <div class="fixed inset-0">
      <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-full scale-150 origin-center rounded-full blur-3xl opacity-40 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 dark:opacity-30" />
      <div class="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-2/3 rounded-full blur-3xl opacity-70 pointer-events-none bg-gradient-to-r from-transparent via-white/15 to-slate-900/60 dark:from-transparent dark:via-white/10 dark:to-black/70" />
      <div class="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-b from-slate-900/10 via-transparent to-slate-900/20 dark:from-black/40 dark:via-black/20 dark:to-black/50" />
    </div>
    <div class="flex-grow flex items-center">
      <section class="w-full py-4 lg:py-6">
        <div class="grid gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1fr)_300px] items-center">
          <div class="space-y-7 max-w-xl">
            <h1 class="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white drop-shadow">
              Build composable apps with <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500">ajo‑kit</span>
            </h1>
            <p class="text-slate-600/90 dark:text-gray-300/85 text-base sm:text-lg leading-relaxed pr-4 max-w-prose">
              A modern starter on top of
              <span class="inline-flex items-center gap-1 mx-2 px-2 py-0.5 rounded-md bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-200 text-sm">Ajo</span>
              and
              <span class="inline-flex items-center gap-1 mx-2 px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:bg-pink-500/25 dark:text-pink-200 text-sm">Vite</span>
              <br />
              Lean primitives, nested layouts, simple SSR, no ceremony.
            </p>
            <div class="flex flex-wrap gap-3 pt-1">
              {actions.map(a => (
                <a
                  href={a.href}
                  class={clsx(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70',
                    a.primary
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow hover:shadow-lg'
                      : 'bg-slate-800/10 hover:bg-slate-800/20 text-slate-700 ring-1 ring-slate-200/30 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200 dark:ring-white/10'
                  )}
                >
                  <span class={clsx('text-base', a.icon)} />
                  <span>{a.label}</span>
                </a>
              ))}
            </div>
          </div>
          <div class="flex flex-col gap-4 max-w-sm w-full mx-auto lg:mx-0">
            {features.map(c => (
              <a
                href={c.href}
                class="group relative flex items-center gap-4 px-4 py-3 rounded-xl ring-1 ring-slate-200/70 dark:ring-white/10 bg-white/60 dark:bg-white/5 hover:ring-indigo-300/60 dark:hover:ring-indigo-400/50 hover:shadow transition backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
              >
                <div class="h-11 w-11 shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow">
                  <div class={clsx('text-xl', c.icon)} />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">{c.label}</h3>
                  <p class="mt-0.5 text-xs sm:text-xs text-slate-600/80 dark:text-gray-300/70 line-clamp-2">{c.desc}</p>
                </div>
                <div class="i-lucide-arrow-right text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition text-sm" />
                <span class="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-indigo-500/15 via-transparent to-transparent dark:from-indigo-400/20" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  </>
)
