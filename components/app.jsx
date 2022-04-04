import { Skip, createComponent, provide } from 'ajo'
import layouts from '/layouts'
import navaid from 'navaid'

const isServer = import.meta.env.SSR
const isDev = import.meta.env.DEV

App.is = 'app-root'

function* App({ pages, http, ctx }, host) {
  const router = navaid()
  const ssr = { current: false }

  let ready, props
  let Layout = ({ children }) => ssr.current ? <Skip end /> : children
  let Page = () => 'Loading...'

  provide(host, 'router', router)

  if (isServer) {
    provide(host, 'ctx', ctx)
    ctx.promises.push(new Promise(r => ready = r))
  } else {
    provide(host, 'ssr', ssr)
    ssr.current = document.body.hasAttribute('ssr')
  }

  for (const [pattern, component] of pages) {
    router.on(pattern, async params => {
      props = params
      const { layout = 'default', default: page, getAsyncProps } = await component()

      Layout = (await layouts[layout]()).default
      Page = createComponent(page)

      if (ssr.current) {
        const data = document.head.querySelector('meta[name=page-props]')?.content
        Object.assign(props, JSON.parse(data ? atob(data) : null))
      } else if (typeof getAsyncProps === 'function') {
        const data = await getAsyncProps({ http, props })
        if (isServer) ctx.meta.push({ name: 'page-props', content: Buffer.from(JSON.stringify(data)).toString('base64') })
        Object.assign(props, data)
      }

      this.update()

      if (isServer) {
        ready()
      } else if (ssr.current) {
        document.body.removeAttribute('ssr')
        ssr.current = false
      }
    })
  }

  isServer ? router.run(ctx.req.path) : router.listen()

  try {
    for ({} of this) {
      try {
        yield <Layout><Page {...props} is='app-page' key={isServer ? ctx.req.path : location.pathname} /></Layout>
      } catch (e) {
        yield <Layout>
          <app-page>
            <strong>Page Error</strong>
            <pre>{(isDev ? e?.stack : e?.message) ?? 'Unknown error.'}</pre>
          </app-page>
        </Layout>
      }
    }
  } finally {
    isServer || router.unlisten()
  }
}

export default createComponent(App)
