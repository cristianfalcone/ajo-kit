import { createComponent, consume } from 'ajo'

const isServer = import.meta.env.SSR

const links = [
  ['/', 'Home', true],
  ['/about', 'About', false],
]

Nav.is = 'nav'

function* Nav({ }, host) {
  const isActive = (path, exact) => {
    let active = (isServer ? consume(host, 'path') : location.pathname) || '/'
    return exact ? active === path : active.startsWith(path)
  }

  for ({} of this) {
    yield (
      <ul>
        {links.map(([path, label, exact]) => (
          <li>
            <a class={isActive(path, exact) ? 'active' : null} href={path}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    )
  }
}

export default createComponent(Nav)
