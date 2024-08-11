import { Component, Function } from 'ajo'
import navaid from 'navaid'

type Loader = () => Promise<{ default: Function | Component }>

type Type = 'layout' | 'page'

export class NotFoundError extends Error { }

const App: Component = function* () {

	const layouts = new Map<string, Loader>()

	const getLayouts = (segments: string[]) => segments
		.map((_, i) => segments.slice(0, i + 1).join('/'))
		.filter(p => layouts.has(p))
		.map(p => layouts.get(p)!().then(m => m.default))

	let Page: Function | Component = () => 'Loading...'

	const router = navaid('/', async (path: string) => {

		const Layouts = await Promise.all(getLayouts(path.split('/')))

		Page = Layouts.reduceRight(
			(Child, Layout) => () => <Layout><Child /></Layout>,
			() => { throw new NotFoundError(path) }
		)

		this.render()
	})

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
					.map(s => s.replace(/^\[(.+?)\]$/, (_, p) => p === '...' ? '*' : ':' + p))
					.join('/')

				router.on(pattern, async params => {

					const [Child, ...Layouts] = await Promise.all([loader().then(m => m.default), ...getLayouts(segments)])

					Page = Layouts.reduceRight(
						(Child, Layout) => () => <Layout params={params}><Child /></Layout>,
						() => <Child key={pattern} params={params} />
					)

					this.render()
				})

				break
		}
	}

	router.listen()

	try {

		while (true) yield <Page />

	} finally {

		router.unlisten?.()
	}
}

export default App
