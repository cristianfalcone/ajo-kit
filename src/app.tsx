import navaid from 'navaid'
import Spinner from '/src/ui/spinner'
import type { Params } from 'navaid'
import type { Component, Stateful } from 'ajo'

type Page = Component<{ params: Params }>

type Loader = () => Promise<{ default: Page }>

type Type = 'layout' | 'page'

export class NotFoundError extends Error { }

type Args = {
	url?: string
}

const App: Stateful<Args> = function* (args) {

	const getLayouts = (segments: string[]) => segments
		.map((_, i) => segments.slice(0, i + 1).join('/'))
		.filter(p => layouts.has(p))
		.map(p => layouts.get(p)!().then(m => [p, m.default])) as Promise<[string, Page]>[]

	const handle = async (main: Promise<Page> | Page, segments: string[], params: Params = {}) => {

		loading = true

		this.next()

		const [Main, ...layouts] = await Promise.all([main, ...getLayouts(segments)])

		loading = false

		Page = layouts.reduceRight(
			(Main, [path, Layout]) => () => <Layout key={path} params={params}><Main /></Layout>,
			() => <Main key={segments.join('/')} params={params} />
		)

		this.next()
	}

	let loading = false, Page: Component = () => null

	const router = navaid('/', path => handle(() => { throw new NotFoundError(path) }, path.split('/')))

	const layouts = new Map<string, Loader>()

	const pages = import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}') as Record<string, Loader>

	for (const [path, loader] of Object.entries(pages)) {

		const segments = path.slice(4).split('/') // Remove leading '/src'

		switch (segments.pop()?.split('.')[0] as Type) { // Remove file extension and get type

			case 'layout':

				layouts.set(segments.join('/'), loader)

				break

			case 'page':

				const pattern = segments
					.filter(s => !/^\(.*\)$/.test(s)) // filter out route groups
					.map(s => s.replace(/^\[(.+?)\]$/, (_, p) => p === '...' ? '*' : ':' + p)) // transform for navaid
					.join('/')

				router.on(pattern, params => handle(loader().then(m => m.default), segments, params))

				break
		}
	}

	args.url ? router.run(args.url) : router.listen()

	try {

		while (true) yield (
			<>
				<Spinner loading={loading} />
				<div class="h-full" memo={Page}>
					<Page />
				</div>
			</>
		)

	} finally {
		router.unlisten?.()
	}
}

App.attrs = { class: 'h-full' }

export default App
