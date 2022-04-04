export default [
  ['/', () => import('./home.jsx')],
  ['/about', () => import('./about.jsx')],
  ['/bench', () => import('./bench.jsx')],
  ['/blog', () => import('./blog.jsx')],
  ['/blog/:id', () => import('./article.jsx')],
]
