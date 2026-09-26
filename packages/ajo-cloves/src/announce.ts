import type { Host } from 'ajo'
import { dom } from './core'

const hidden = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0'

let region: HTMLDivElement | undefined

const create = () => {
	const next = document.createElement('div')
	next.setAttribute('role', 'status')
	next.setAttribute('aria-live', 'polite')
	next.setAttribute('aria-atomic', 'true')
	next.setAttribute('style', hidden)
	return next
}

/** Screen-reader announcements through one lazily created document-lifetime polite live region. */
export const announce = (host: Host) => {
	if (!dom(host)) return { polite(_message: string) { } }

	return {
		polite(message: string) {
			region ??= create()
			if (!region.isConnected) document.body.append(region)
			const target = region
			target.textContent = ''
			queueMicrotask(() => target.textContent = message)
		},
	}
}
