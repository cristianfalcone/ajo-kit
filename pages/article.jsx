export default ({ post }) =>
	<>
		<h1>{post.title}</h1>
		<p>{post.body}</p>
	</>

export const getAsyncProps = async ({ http, props }) => {
	const post = await http.get(`https://jsonplaceholder.typicode.com/posts/${props.id}`).then(res => res.data).catch(() => [])
	return { post }
}
