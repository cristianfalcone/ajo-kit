import clsx from 'clsx'
import type { Children, IntrinsicElements, Stateful } from 'ajo'

export type Props = {
  src?: string
  alt?: string
  class?: string
  aspect?: string
  placeholder?: Children
} & Partial<IntrinsicElements['img']>

export const Image: Stateful<Props> = function* (args) {

  let current = args.src
  let loaded = false

  const reset = (next: string) => this.next(() => {
    current = next
    loaded = false
  })

  while (true) {

    const { src = '', alt = '', class: className, placeholder, aspect = '', ...rest } = args

    if (src !== current) reset(src)

    const imageClasses = clsx(
      'size-full object-cover transition-opacity duration-500',
      loaded ? 'opacity-100' : 'opacity-0',
      className
    )

    if (!import.meta.env.SSR) this.style.aspectRatio = aspect

    yield (
      <>
        <img
          {...rest}
          src={src}
          alt={alt}
          class={imageClasses}
          loading={rest.loading ?? 'lazy'}
          ref={el => {
            if (el && !loaded) {
              if (el.complete) {
                queueMicrotask(() => this.next(() => loaded = true))
              } else {
                el.onload = () => this.next(() => loaded = true)
                el.onerror = () => this.next(() => loaded = true)
              }
            }
          }}
        />
        {!loaded && (
          <div class="absolute inset-0 grid place-items-center bg-slate-900/5 dark:bg-white/5 animate-pulse">
            {placeholder ?? (
              <div class="size-6 rounded-full border-2 border-indigo-400/30 border-t-indigo-500 dark:border-indigo-300/30 dark:border-t-indigo-300 animate-spin [animation-duration:850ms]" />
            )}
          </div>
        )}
      </>
    )
  }
}

Image.attrs = { class: 'relative overflow-hidden' }
