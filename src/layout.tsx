import clsx from 'clsx'
import { NotFoundError } from '/src/app'
import type { Children, Stateful } from 'ajo'

const isDev = import.meta.env.DEV

type Args = {
	children: Children,
}

export default (function* (args: Args) {

	while (true) {

		try {

			yield <Layout>{args.children}</Layout>

		} catch (error: unknown) {

			yield (
				<Layout>
					<AppError error={error instanceof Error ? error : new Error('An unknown error occurred')} />
				</Layout>
			)
		}
	}
}) as Stateful<Args>

const Layout = (args: Args) =>
	<>
		<Nav />
		<main>
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{args.children}
			</div>
		</main>
	</>

const AppError = ({ error }: { error: Error }) => {

	const isNotFound = error instanceof NotFoundError

	return (
		<div class="mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-5xl">
				<div class="rounded-md bg-red-50 p-4 overflow-x-auto">
					<div class="flex">
						<div class={clsx(['flex-shrink-0', isNotFound ? 'text-yellow-400' : 'text-red-400'])}>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
								{isNotFound ? (
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
								) : (
									<path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
								)}
							</svg>
						</div>
						<div class="ml-3">
							<h3 class={clsx(['text-sm font-medium', isNotFound ? 'text-yellow-800' : 'text-red-800'])}>
								{isNotFound ? 'Page Not Found' : 'Something Unexpected Happened'}
							</h3>
							<div class={clsx(['mt-2 text-sm', isNotFound ? 'text-yellow-700' : 'text-red-700'])}>
								{isNotFound ? (
									<>
										<p>Sorry, we couldn't find the page you're looking for.</p>
									</>
								) : (
									<pre>
										{isDev ? error.stack ?? error.message : 'Application Error'}
									</pre>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

const links: [string, string, boolean?][] = [
	['/', 'Home', true],
	['/blog', 'Blog'],
	['/about', 'About'],
	['/cart', 'Cart'],
	['/checkout', 'Checkout'],
]

const isActive = (path: string, url: string, exact?: boolean): boolean => exact ? url === path : url.startsWith(path)

const Nav = () => {

	const url = location.pathname

	return (
		<nav class="bg-gray-800" memo={url}>
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="flex h-16 items-center justify-between">
					<div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
						<div class="flex space-x-4">
							{links.map(([path, label, exact]) => {
								const active = isActive(path, url, exact)
								return (
									<a
										href={path as string}
										class={clsx([active ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white', 'rounded-md px-3 py-2 text-sm font-medium'])}
										aria-current={active ? 'page' : undefined}
									>
										{label}
									</a>
								)
							})}
						</div>
					</div>
				</div>
			</div>
		</nav>
	)
}
