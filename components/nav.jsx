import { component, consume } from 'ajo'

const isServer = import.meta.env.SSR

const Nav = host => {
	const links = [
		['/', 'Home', true],
		['/about', 'About', false],
		['/blog', 'Blog', false],
	]

	const isActive = (path, exact) => {
		let active = (isServer ? consume(host, 'ctx')?.req.path : location.pathname) || '/'
		return exact ? active === path : active.startsWith(path)
	}

	return () =>
		<ul>
			{links.map(([path, label, exact]) => (
				<li>
					<a class={isActive(path, exact) ? 'active' : null} href={path}>
						{label}
					</a>
				</li>
			))}
		</ul>
}

Nav.is = 'nav'

export default component(Nav)
