import { QueryObserver } from '@tanstack/query-core'
import { QueryClientContext } from '/src/constants'
import type { Stateful } from 'ajo'

interface Post {
	id: number
	title: string
}

const Blog: Stateful = function* () {

	const fetchPosts = async () => {
		const response = await fetch('https://jsonplaceholder.typicode.com/posts')
		if (!response.ok) throw new Error('Something went wrong')
		return response.json()
	}

	const observer = new QueryObserver<Post[]>(QueryClientContext(), {
		queryKey: ['posts'],
		queryFn: fetchPosts,
	})

	const unsubscribe = observer.subscribe(() => this.next())

	try {

		while (true) {

			const { error, isLoading, data } = observer.getCurrentResult()

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
