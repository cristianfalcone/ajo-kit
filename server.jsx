import 'backdom/register'
import * as http from 'httpie/node'
import { render } from 'ajo'
import App from '/components/app.jsx'
import pages from '/pages'

export default async ctx => {
  ctx.promises = []
  const host = document.createElement('t')
  render(<App pages={pages} http={http} ctx={ctx} />, host)
  await Promise.race([new Promise(r => setTimeout(r, 10000)), Promise.all(ctx.promises)])
  ctx.main = host.innerHTML
}
