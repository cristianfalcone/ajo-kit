import 'undom/register'
import { render } from 'ajo'
import App from '/components/app.jsx'
import pages from '/pages'

const replacements = {
  '\xA0': '&nbsp;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
}

const isVoid = name => /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i.test(name)
const isEmpty = tag => /^(?:allowfullscreen|allowpaymentrequest|async|autofocus|autoplay|checked|class|contenteditable|controls|default|defer|disabled|draggable|formnovalidate|hidden|id|ismap|itemscope|loop|multiple|muted|nomodule|novalidate|open|playsinline|readonly|required|reversed|selected|style|truespee)$/i.test(tag)

Text.prototype.toString = function () {
  return String.prototype.replace.call(this.nodeValue, /[<>&\xA0]/g, c => replacements[c])
}

Element.prototype.toString = function () {
  const tag = this.nodeName.toLowerCase()
  return `<${tag}${this.attributes.map(({ name, value }) =>
    name.startsWith('on') ? '' : isEmpty(name) && !value ? ` ${name}` : ` ${name}="${String(value).replace(/"/g, '&quot;')}"`
  ).join('')}>${isVoid(tag) ? '' : `${this.childNodes.join('')}</${tag}>`}`
}

Element.prototype.getAttributeNames = function () {
  return this.attributes.map(attr => attr.name)
}

export default async path => {
  const promises = []
  const container = document.createElement('t')
  render(<App {...{ pages, path, promises }} />, container)
  await Promise.race([new Promise(r => setTimeout(r, 10000)), Promise.all(promises)])
  return container.childNodes.join('')
}
