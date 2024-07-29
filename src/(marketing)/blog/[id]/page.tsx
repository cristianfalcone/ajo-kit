import { Component } from 'ajo'
import { QueryObserver } from '@tanstack/query-core'
import { QueryClientContext } from '/src/constants'

type Props = {
	params: { id: string }
}

interface Post {
	title: string
	body: string
}

const Post: Component<Props> = function* (props) {

	const fetchPost = async () => {

		const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${props.params.id}`)

		if (!response.ok) {

			if (response.status === 404) throw new Error('Post not found')

			throw new Error('Something went wrong')
		}

		return response.json()
	}

	const observer = new QueryObserver<Post>(QueryClientContext(this), {
		queryKey: ['post', props.params.id],
		queryFn: fetchPost,
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
