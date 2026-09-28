import type { Preset } from 'unocss'

/** Shortcuts and rules of Select, Command, Calendar and InputDate. */
export const pickers: Preset = {
  name: 'ajo-ui-playa-pickers',
  shortcuts: {
    'playa-select-root': 'relative inline-block',
    // Control text is Input's: 16 px below sm, so a phone does not zoom, and 14 px from sm.
    'playa-select-trigger': 'flex h-control w-fit items-center justify-between gap-2 playa-field playa-disabled px-3 text-base whitespace-nowrap sm:text-sm data-[placeholder]:text-faint-foreground data-[size=sm]:h-control-sm data-[size=lg]:h-control-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground *:data-[slot=select-icon]:playa-select-trigger-icon',
    'playa-select-trigger-icon': 'i-lucide-chevron-down size-4 opacity-50',
    // Opens like every floating layer: a fade and a scale from 0.98. Under reduced
    // motion none runs; the [data-state] match outranks the state's animate-in.
    'playa-select-content': 'isolate z-50 m-0 [&:popover-open]:flex max-h-[max(96px,var(--available-height,24rem))] min-w-[var(--reference-width,8rem)] flex-col overflow-hidden rounded-md glass-overlay edge shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 [animation-timing-function:var(--ease)] motion-reduce:[&[data-state]]:animate-none',
    'playa-select-list': 'overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 scroll-py-1 p-1 [[data-slot=select-content][data-empty]_&]:p-0',
    // Rows sit on the 4 px grid, 32 px tall, in the trigger's text size (16 px
    // below sm, 14 px from sm). The highlight is the gold tint;
    // the chosen row keeps a lighter one and its check at the start, where
    // labels and the create row line their text up with the options.
    'playa-select-row': 'relative flex min-h-8 w-full cursor-default items-center gap-2 rounded-sm py-1 pe-2 ps-8 text-base sm:text-sm outline-none select-none data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-[var(--disabled-opacity)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground',
    'playa-select-item': 'playa-select-row [&[data-selected=true]:not([data-highlighted])]:bg-accent/40 *:data-[slot=select-item-indicator]:playa-select-indicator **:data-[slot=select-item-indicator-icon]:playa-select-indicator-icon',
    'playa-select-create': 'playa-select-row text-muted-foreground data-[highlighted=true]:text-accent-foreground',
    'playa-select-indicator': 'pointer-events-none absolute start-2 flex size-4 items-center justify-center data-[selected=false]:invisible',
    'playa-select-indicator-icon': 'i-lucide-check size-4',
    'playa-select-label': 'pe-2 ps-8 pt-2 pb-1 text-xs text-muted-foreground',
    'playa-select-separator': 'pointer-events-none my-1 h-px bg-border',
    'playa-select-empty': 'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground [[data-slot=select-content][data-empty]_&]:flex',
    'playa-select-status': 'flex w-full items-center justify-center gap-2 py-2 text-center text-sm text-muted-foreground empty:hidden',
    // SelectInput's control, addon, show-options button and chevron are
    // base-owned nodes, themed by slot from the input group root. A composed
    // SelectClear takes the button's place while there is something to clear.
    'playa-select-input': [
      '*:data-[slot=select-input]:flex *:data-[slot=select-input]:h-control *:data-[slot=select-input]:min-w-0 *:data-[slot=select-input]:flex-1 *:data-[slot=select-input]:rounded-none *:data-[slot=select-input]:border-0 *:data-[slot=select-input]:bg-transparent *:data-[slot=select-input]:px-3 *:data-[slot=select-input]:text-base *:data-[slot=select-input]:shadow-none *:data-[slot=select-input]:outline-none',
      '*:data-[slot=select-input]:selection:bg-primary *:data-[slot=select-input]:selection:text-primary-foreground *:data-[slot=select-input]:disabled:pointer-events-none *:data-[slot=select-input]:disabled:opacity-[var(--disabled-opacity)] *:data-[slot=select-input]:sm:text-sm',
      '*:data-[slot=input-group-addon]:order-last *:data-[slot=input-group-addon]:flex *:data-[slot=input-group-addon]:cursor-text *:data-[slot=input-group-addon]:select-none *:data-[slot=input-group-addon]:items-center *:data-[slot=input-group-addon]:justify-center *:data-[slot=input-group-addon]:gap-2 *:data-[slot=input-group-addon]:pe-3 *:data-[slot=input-group-addon]:text-sm *:data-[slot=input-group-addon]:font-medium *:data-[slot=input-group-addon]:text-muted-foreground',
      '*:data-[slot=input-group-addon]:group-data-[disabled=true]/input-group:opacity-[var(--disabled-opacity)] *:data-[slot=input-group-addon]:has-[>button]:pe-2 *:data-[slot=input-group-addon]:has-[>kbd]:pe-2 [&>[data-slot=input-group-addon]>kbd]:rounded-[calc(var(--radius)-5px)] [&>[data-slot=input-group-addon]>svg:not([class*=size-])]:size-4',
      // The show-options button takes the default focus ring, flush around it.
      '**:data-[slot=select-input-trigger]:inline-flex **:data-[slot=select-input-trigger]:size-6 **:data-[slot=select-input-trigger]:shrink-0 **:data-[slot=select-input-trigger]:items-center **:data-[slot=select-input-trigger]:justify-center **:data-[slot=select-input-trigger]:rounded-[calc(var(--radius)-5px)] **:data-[slot=select-input-trigger]:text-muted-foreground **:data-[slot=select-input-trigger]:transition-colors',
      '**:data-[slot=select-input-trigger]:hover:bg-accent **:data-[slot=select-input-trigger]:hover:text-foreground **:data-[slot=select-input-trigger]:disabled:pointer-events-none **:data-[slot=select-input-trigger]:disabled:opacity-[var(--disabled-opacity)]',
      '[&:has([data-slot=select-clear])_[data-slot=select-input-trigger]]:hidden',
      '**:data-[slot=select-input-trigger-icon]:i-lucide-chevron-down **:data-[slot=select-input-trigger-icon]:pointer-events-none **:data-[slot=select-input-trigger-icon]:size-4',
    ].join(' '),
    // The chips field rings like one control while its input has focus: the
    // one flush ring over its boundary, danger when invalid, never a halo.
    'playa-select-chips': 'flex min-h-control flex-wrap items-center gap-1 playa-field px-2 py-1 text-base sm:text-sm has-[input:focus-visible]:[outline:var(--focus-width)_solid_var(--ring)] has-aria-invalid:inset-ring-danger has-aria-invalid:has-[input:focus-visible]:[outline-color:var(--danger)]',
    'playa-select-chips-input': 'min-w-16 flex-1 bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-[var(--disabled-opacity)]',
  },
}
