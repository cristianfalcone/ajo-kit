import 'backdom/register.js'
import { render } from 'ajo'
import App from '/components/app.jsx'
import pages from '/pages'

export default async path => {
  const promises = []
  const host = document.createElement('t')
  render(<App {...{ pages, path, promises }} />, host)
  await Promise.race([new Promise(r => setTimeout(r, 10000)), Promise.all(promises)])
  return host.innerHTML
}
