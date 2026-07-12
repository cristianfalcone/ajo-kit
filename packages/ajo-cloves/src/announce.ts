import type { Host } from './core'
import { dom } from './core'

type Channel = 'polite' | 'assertive'

const hidden = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0'

let polite: HTMLDivElement | undefined
let assertive: HTMLDivElement | undefined

const create = (channel: Channel) => {

	const region = document.createElement('div')

	region.setAttribute('role', channel === 'polite' ? 'status' : 'alert')
	region.setAttribute('aria-live', channel)
	region.setAttribute('aria-atomic', 'true')
	region.setAttribute('style', hidden)
	document.body.append(region)

	return region
}

const region = (channel: Channel) => {

	const slot = channel === 'polite' ? polite : assertive
	const next = slot ?? create(channel)

	if (channel === 'polite') polite = next
	else assertive = next

	if (!next.isConnected) document.body.append(next)
	return next
}

const send = (channel: Channel, message: string) => {

	const target = region(channel)

	target.textContent = ''
	queueMicrotask(() => target.textContent = message)
}

/** Screen-reader announcements through lazily created document-lifetime aria-live regions. */
export const announce = (host: Host) => {
	if (!dom(host)) {
		return {
			polite(_message: string) { },
			assertive(_message: string) { },
		}
	}

	return {
		polite(message: string) {
			send('polite', message)
		},
		assertive(message: string) {
			send('assertive', message)
		},
	}
}
