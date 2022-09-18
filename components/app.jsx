import { component, provide, refresh, cleanup, intercept } from 'ajo'
import layouts from '/layouts'
import navaid from 'navaid'

const isServer = import.meta.env.SSR
const isDev = import.meta.env.DEV

const App = host => {
	const { pages, http, ctx } = host.$params
	const router = navaid()
	const ssr = { current: false }

	let ready, props
	let Layout = ({ children }) => ssr.current ? Array.from(host.childNodes) : children
	let Page = () => 'Loading...'

	provide(host, 'router', router)

	if (isServer) {
		provide(host, 'ctx', ctx)
		ctx.promises.push(new Promise(r => ready = r))
	} else {
		provide(host, 'ssr', ssr)
		ssr.current = document.body.hasAttribute('ssr')
	}

	for (const [pattern, factory] of pages) {
		router.on(pattern, async params => {
			props = params
			const { layout = 'default', default: page, getAsyncProps } = await factory()

			Layout = (await layouts[layout]()).default
			Page = page

			if (ssr.current) {
				const data = document.head.querySelector('meta[name=page-props]')?.content
				Object.assign(props, JSON.parse(data ? atob(data) : null))
			} else if (typeof getAsyncProps === 'function') {
				const data = await getAsyncProps({ http, props })
				if (isServer) ctx.meta.push({ name: 'page-props', content: Buffer.from(JSON.stringify(data)).toString('base64') })
				Object.assign(props, data)
			}

			refresh(host)

			if (isServer) {
				ready()
			} else if (ssr.current) {
				document.body.removeAttribute('ssr')
				ssr.current = false
			}
		})
	}

	intercept(host, error =>
		<Layout>
			<strong>Page Error</strong>
			<pre>{(isDev ? error?.stack : error?.message) ?? 'Unknown error.'}</pre>
		</Layout>
	)

	if (isServer) {
		router.run(ctx.req.path)
	} else {
		router.listen()
		cleanup(host, () => router.unlisten())
	}

	return () => <Layout><Page {...props} key={isServer ? ctx.req.path : location.pathname} /></Layout>
}

App.is = 'app-root'

export default component(App)
