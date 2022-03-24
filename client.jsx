import { render } from 'ajo'
import App from '/components/app.jsx'
import pages from '/pages'

render(<App pages={pages} />, document.body)
