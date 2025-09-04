import { QueryObserver } from '@tanstack/query-core'
import { QueryClientContext } from '/src/constants'
import type { Stateful } from 'ajo'

type Args = {
	params: { id: string }
}

interface Post {
	title: string
	body: string
}

const Post: Stateful<Args> = function* (args) {

	const fetchPost = async () => {

		const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${args.params.id}`)

		if (!response.ok) {
			if (response.status === 404) throw new Error('Post not found')
			throw new Error('Something went wrong')
		}

		return response.json()
	}

	const query = new QueryObserver<Post>(QueryClientContext(), {
		queryKey: ['post', args.params.id],
		queryFn: fetchPost,
	})

	const unsubscribe = query.subscribe(() => this.next())

	try {

		while (true) {

			const { error, isLoading, data } = query.getCurrentResult()

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
					<>
						<h1>{data.title}</h1>
						<p set:innerHTML={data.body} skip />
					</>
				)
			}
		}

	} finally {
		unsubscribe()
	}
}

export default Post
