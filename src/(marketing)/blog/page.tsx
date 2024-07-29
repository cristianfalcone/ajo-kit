import { Component } from 'ajo'
import { QueryObserver } from '@tanstack/query-core'
import { QueryClientContext } from '/src/constants'

interface Post {
	id: number
	title: string
}

const Blog: Component = function* () {

	const fetchPosts = async () => {

		const response = await fetch('https://jsonplaceholder.typicode.com/posts')

		return response.json()
	}

	const observer = new QueryObserver<Post[]>(QueryClientContext(this), {
		queryKey: ['posts'],
		queryFn: fetchPosts,
	})

	let state = observer.getCurrentResult()

	const unsubscribe = observer.subscribe(result => {
		state = result
		this.render()
	})

	try {

		while (true) {

			const { data, error, isLoading } = state

			if (error) {
				yield <p class="text-red-500">{error.message}</p>
				continue
			}

			if (isLoading) {
				yield <p class="text-gray-500">Loading...</p>
				continue
			}

			if (data) {
				yield (
					<ul>
						{data.map((post) => (
							<li key={post.id}>
								<a href={`/blog/${post.id}`}>
									{post.title}
								</a>
							</li>
						))}
					</ul>
				)
			}
		}

	} finally {
		unsubscribe()
	}
}

export default Blog
