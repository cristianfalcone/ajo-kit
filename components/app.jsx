import { Skip, createComponent, provide } from 'ajo'
import layouts from '/layouts'
import navaid from 'navaid'

const isServer = import.meta.env.SSR
const isDev = import.meta.env.DEV

App.is = 'app-root'

function* App({ path, pages, promises }, host) {
  const router = navaid()
  const ssr = { current: false }
  const getPath = () => isServer ? path : location.pathname
  
  let ready, props
  let Layout = ({ children }) => ssr.current ? <Skip end/> : children
  let Page = () => 'Loading...'

  provide(host, 'router', router)

  if (isServer) {
    provide(host, 'promises', promises)
    promises.push(new Promise(r => ready = r))
  } else {
    provide(host, 'ssr', ssr)
    ssr.current = document.body.hasAttribute('ssr')
  }

  for (const [pattern, component] of pages) {
    router.on(pattern, async params => {
      props = params
      const { layout = 'default', default: page } = await component()

      Layout = (await layouts[layout]()).default
      Page = createComponent(page)
      provide(host, 'path', getPath())

      this.update()

      if (isServer) {
        ready()
      } else if (ssr) {
        document.body.removeAttribute('ssr')
        ssr.current = false
      }
    })
  }

  isServer ? router.run(path) : router.listen()

  try {
    for ({} of this) {
      try {
        yield <Layout><Page is='app-page' key={getPath()} {...props} /></Layout>
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
