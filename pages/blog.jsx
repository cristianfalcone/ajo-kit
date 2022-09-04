export default ({ posts }) =>
	<ul>
		{posts.map(post =>
			<li>
				<a href={`/blog/${post.id}`}>{post.title}</a>
			</li>
		)}
	</ul>

export const getAsyncProps = async ({ http }) => {
	const posts = await http.get('https://jsonplaceholder.typicode.com/posts').then(res => res.data).catch(() => [])
	return { posts }
}
