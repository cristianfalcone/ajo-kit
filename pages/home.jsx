import { consume } from 'ajo'

export default ({ }, host) =>
  <>
    <h1>Hello World!</h1>
    <p>
      Welcome to my
      <i>{consume(host, 'ssr')?.current ? ' client hydrated ' : import.meta.env.SSR ? ' server rendered ' : ' client rendered '}</i>
      home page.
    </p>
  </>
