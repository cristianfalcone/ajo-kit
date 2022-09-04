export default [
	['/', () => import('./home.jsx')],
	['/about', () => import('./about.jsx')],
	['/blog', () => import('./blog.jsx')],
	['/blog/:id', () => import('./article.jsx')],
]
