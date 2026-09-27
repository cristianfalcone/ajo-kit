import type { Preset } from 'unocss'

/** Shortcuts and rules of Select, Command, Calendar and InputDate. */
export const pickers: Preset = {
  name: 'ajo-ui-playa-pickers',
  shortcuts: {
    'playa-select-root': 'relative inline-block',
    'playa-select-trigger': 'flex w-fit items-center justify-between gap-2 playa-field px-3 py-2 text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground *:data-[slot=select-icon]:playa-select-trigger-icon',
    'playa-select-trigger-icon': 'i-lucide-chevron-down size-4 opacity-50',
    'playa-select-content': 'isolate z-50 m-0 [&:popover-open]:flex max-h-[max(96px,var(--available-height,24rem))] min-w-[var(--reference-width,8rem)] flex-col overflow-hidden rounded-md glass-overlay edge shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    'playa-select-list': 'overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 scroll-py-1 p-1 [[data-slot=select-content][data-empty]_&]:p-0',
    'playa-select-row': 'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pl-2 text-sm outline-none select-none data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground',
    'playa-select-item': 'playa-select-row pr-9 *:data-[slot=select-item-indicator]:playa-select-indicator **:data-[slot=select-item-indicator-icon]:playa-select-indicator-icon',
    'playa-select-create': 'playa-select-row pr-2 text-muted-foreground data-[highlighted=true]:text-accent-foreground',
    'playa-select-indicator': 'pointer-events-none absolute right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground pointer-coarse:size-5 data-[selected=true]:opacity-100 data-[selected=false]:opacity-0',
    'playa-select-indicator-icon': 'i-lucide-check pointer-events-none size-3 pointer-coarse:size-3.5',
    'playa-select-label': 'px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm',
    'playa-select-separator': 'pointer-events-none -mx-1 my-1 h-px bg-border',
    'playa-select-empty': 'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground [[data-slot=select-content][data-empty]_&]:flex',
    'playa-select-status': 'flex w-full items-center justify-center gap-2 py-2 text-center text-sm text-muted-foreground empty:hidden',
    // SelectInput's control, addon, show-options button and chevron are
    // base-owned nodes, themed by slot from the input group root. A composed
    // SelectClear takes the button's place while there is something to clear.
    'playa-select-input': [
      '*:data-[slot=select-input]:flex *:data-[slot=select-input]:h-9 *:data-[slot=select-input]:min-w-0 *:data-[slot=select-input]:flex-1 *:data-[slot=select-input]:rounded-none *:data-[slot=select-input]:border-0 *:data-[slot=select-input]:bg-transparent *:data-[slot=select-input]:px-3 *:data-[slot=select-input]:py-1 *:data-[slot=select-input]:text-base *:data-[slot=select-input]:shadow-none *:data-[slot=select-input]:transition-[color,box-shadow] *:data-[slot=select-input]:outline-none',
      '*:data-[slot=select-input]:selection:bg-primary *:data-[slot=select-input]:selection:text-primary-foreground *:data-[slot=select-input]:placeholder:text-muted-foreground *:data-[slot=select-input]:disabled:pointer-events-none *:data-[slot=select-input]:disabled:cursor-not-allowed *:data-[slot=select-input]:disabled:opacity-50 *:data-[slot=select-input]:md:text-sm *:data-[slot=select-input]:focus-visible:ring-0 *:data-[slot=select-input]:aria-invalid:ring-0',
      '*:data-[slot=input-group-addon]:order-last *:data-[slot=input-group-addon]:flex *:data-[slot=input-group-addon]:h-auto *:data-[slot=input-group-addon]:cursor-text *:data-[slot=input-group-addon]:select-none *:data-[slot=input-group-addon]:items-center *:data-[slot=input-group-addon]:justify-center *:data-[slot=input-group-addon]:gap-2 *:data-[slot=input-group-addon]:py-1.5 *:data-[slot=input-group-addon]:pr-3 *:data-[slot=input-group-addon]:text-sm *:data-[slot=input-group-addon]:font-medium *:data-[slot=input-group-addon]:text-muted-foreground',
      '*:data-[slot=input-group-addon]:group-data-[disabled=true]/input-group:opacity-50 *:data-[slot=input-group-addon]:has-[>button]:mr-[-0.45rem] *:data-[slot=input-group-addon]:has-[>kbd]:mr-[-0.35rem] [&>[data-slot=input-group-addon]>kbd]:rounded-[calc(var(--radius)-5px)] [&>[data-slot=input-group-addon]>svg:not([class*=size-])]:size-4',
      '**:data-[slot=select-input-trigger]:inline-flex **:data-[slot=select-input-trigger]:size-6 **:data-[slot=select-input-trigger]:shrink-0 **:data-[slot=select-input-trigger]:items-center **:data-[slot=select-input-trigger]:justify-center **:data-[slot=select-input-trigger]:rounded-[calc(var(--radius)-5px)] **:data-[slot=select-input-trigger]:text-sm **:data-[slot=select-input-trigger]:font-medium **:data-[slot=select-input-trigger]:whitespace-nowrap **:data-[slot=select-input-trigger]:text-muted-foreground **:data-[slot=select-input-trigger]:outline-none **:data-[slot=select-input-trigger]:transition-all',
      '**:data-[slot=select-input-trigger]:hover:bg-accent **:data-[slot=select-input-trigger]:hover:text-foreground **:data-[slot=select-input-trigger]:focus-visible:ring-3 **:data-[slot=select-input-trigger]:focus-visible:ring-ring/50 **:data-[slot=select-input-trigger]:active:scale-[0.98] **:data-[slot=select-input-trigger]:motion-reduce:active:scale-100 **:data-[slot=select-input-trigger]:disabled:pointer-events-none **:data-[slot=select-input-trigger]:disabled:opacity-50',
      '[&:has([data-slot=select-clear])_[data-slot=select-input-trigger]]:hidden',
      '**:data-[slot=select-input-trigger-icon]:i-lucide-chevron-down **:data-[slot=select-input-trigger-icon]:pointer-events-none **:data-[slot=select-input-trigger-icon]:size-4 **:data-[slot=select-input-trigger-icon]:text-muted-foreground',
    ].join(' '),
    'playa-select-chips': 'flex min-h-9 flex-wrap items-center gap-1.5 playa-field px-2.5 py-1.5 text-sm focus-within:inset-ring-ring focus-within:ring-3 focus-within:ring-ring/25 has-aria-invalid:inset-ring-danger has-aria-invalid:ring-danger/20',
    'playa-select-chips-input': 'min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
  },
}
