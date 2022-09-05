import { For } from 'ajo'

export default ({ posts }) =>
	<For each={posts} is="ul">
		{post =>
			<li>
				<a href={`/blog/${post.id}`}>{post.title}</a>
			</li>
		}
	</For>

export const getAsyncProps = async ({ http }) => {
	const posts = await http.get('https://jsonplaceholder.typicode.com/posts').then(res => res.data).catch(() => [])
	return { posts }
}
