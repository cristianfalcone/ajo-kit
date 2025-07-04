import clsx from 'clsx'

const spinner = (
  <svg xmlns="http://www.w3.org/2000/svg" class="animate-spin h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

const Spinner = ({ loading, duration }: { loading: boolean, duration?: number }) =>
  <div class={clsx(
    `fixed inset-0 flex items-center justify-center bg-white/50 z-50 transition-opacity ease-in-out duration-${duration ?? 500}`,
    loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
  )}>
    {spinner}
  </div>

export default Spinner
