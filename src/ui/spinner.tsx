import Panel from '/src/ui/panel'

interface SpinnerProps {
  loading: boolean
  duration?: number
  delay?: number
  label?: string
  overlay?: boolean
}

export default function Spinner({ loading, duration = 300, delay = 400, label = 'Loading', overlay = true }: SpinnerProps) {

  const base = 'fixed inset-0 flex items-center justify-center z-50'
  const style = loading
    ? `opacity:0;animation:fade-in ${duration}ms ease-out ${delay}ms forwards`
    : `opacity:0;pointer-events:none;transition:opacity ${duration}ms ease-in-out`

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading ? 'true' : 'false'}
      class={`${base} keyframes-fade-in`}
      style={style}
    >
      {overlay && <div class="absolute inset-0 backdrop-blur-sm bg-[#edf4f3]/60 dark:bg-black/40" />}
      <Panel variant="solid" radius="xl" padding="none" class="relative px-5 py-4 flex flex-col items-center gap-3">
        <SpinnerVisual />
        <p class="text-xs tracking-wide uppercase font-medium text-slate-600/80 dark:text-muted" aria-hidden="true">{label}</p>
        <span class="sr-only">{label}</span>
      </Panel>
    </div>
  )
}

const SpinnerVisual = () => (
  <div class="relative h-10 w-10">
    <div class="absolute inset-0 rounded-full border-2 border-slate-300/40 dark:border-white/10 border-t-accent dark:border-t-accent animate-spin motion-reduce:animate-none [animation-duration:900ms]" />
    <div class="absolute inset-2 rounded-full bg-[#fbfdfb]/85 dark:bg-primary flex items-center justify-center">
      <div class="h-2.5 w-2.5 rounded-full bg-accent animate-pulse motion-reduce:animate-none" />
    </div>
  </div>
)
