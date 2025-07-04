import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import { render } from 'ajo'
import App from '/src/app'

const root = document.getElementById('root')

if (root) render(<App />, root)
