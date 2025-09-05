import clsx from 'clsx'

interface SpinnerProps {
  loading: boolean
  duration?: number
  label?: string
  overlay?: boolean
}

export default function Spinner({ loading, duration = 300, label = 'Loading', overlay = true }: SpinnerProps) {

  // static utility classes so Uno can tree-shake properly; dynamic duration moved inline
  const container = clsx(
    'fixed inset-0 flex items-center justify-center z-50 transition-opacity ease-in-out',
    loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
  )

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading ? 'true' : 'false'}
      class={container}
      style={{ transitionDuration: duration + 'ms' }}
    >
      {overlay && <div class="absolute inset-0 backdrop-blur-sm bg-white/60 dark:bg-black/40" />}
      <div class="relative px-5 py-4 rounded-xl panel flex flex-col items-center gap-3 shadow-sm dark:shadow-none">
        <SpinnerVisual />
        <p class="text-[11px] tracking-wide uppercase font-medium text-slate-600/80 dark:text-indigo-200/70" aria-hidden="true">{label}</p>
        <span class="sr-only">{label}</span>
      </div>
    </div>
  )
}

const SpinnerVisual = () => (
  <div class="relative h-10 w-10">
    <div class="absolute inset-0 rounded-full border-2 border-slate-300/40 dark:border-white/10 border-t-indigo-500/70 dark:border-t-indigo-400/70 animate-spin motion-reduce:animate-none [animation-duration:900ms]" />
    <div class="absolute inset-2 rounded-full bg-white/80 dark:bg-[#0a0f1c] flex items-center justify-center">
      <div class="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 animate-pulse motion-reduce:animate-none" />
    </div>
  </div>
)
