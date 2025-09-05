import { QueryObserver } from '@tanstack/query-core'
import type { Stateful } from 'ajo'
import { QueryClientContext } from '/src/constants'

interface User {
  id: number
  username: string
}

interface Post {
  id: number
  title: string
  body: string
  userId: number
  user?: User
  imageUrl: string
}

const Hero = (
  <header class="text-center space-y-4 max-w-3xl mx-auto">
    <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Latest Posts</h1>
    <p class="text-sm text-indigo-600/70 dark:text-indigo-200/70">Fresh updates pulled from a public sample API.</p>
  </header>
)

const Page: Stateful<{}, 'article'> = function* () {

  const observer = new QueryObserver<Post[]>(QueryClientContext(), {

    queryKey: ['posts-query'],

    queryFn: async () => {

      const [postsRes, usersRes] = await Promise.all([
        fetch('https://dummyjson.com/posts?limit=18'),
        fetch('https://dummyjson.com/users?limit=100'),
      ])

      if (!postsRes.ok || !usersRes.ok) throw new Error('Failed to load posts')

      const postsJson = await postsRes.json()
      const usersJson = await usersRes.json()
      const posts = postsJson.posts as any[]
      const users = usersJson.users as any[]

      return posts.map(p => ({
        ...p,
        user: users.find(u => u.id === p.userId),
        imageUrl: `https://picsum.photos/seed/ajo-post-${p.id}/600/400`,
      }))
    },
  })

  const unsubscribe = observer.subscribe(() => this.next())

  try {

    while (true) {

      const { error, isLoading, data } = observer.getCurrentResult()

      if (error) {

        yield (
          <>
            {Hero}
            <div class="max-w-md mx-auto rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </div>
          </>
        )

        continue
      }

      if (isLoading) {

        yield (
          <>
            {Hero}
            <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <li key={i} class="rounded-xl bg-slate-900/5 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 overflow-hidden">
                  <div class="h-28 w-full bg-slate-900/5 dark:bg-white/5 animate-pulse" />
                  <div class="p-4 space-y-2">
                    <div class="h-4 w-2/3 bg-slate-900/5 dark:bg-white/5 rounded animate-pulse" />
                    <div class="h-3 w-5/6 bg-slate-900/5 dark:bg-white/5 rounded animate-pulse" />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )

        continue
      }

      if (data) yield (
        <>
          {Hero}
          <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map(post => (
              <li key={post.id}>
                <a href={`/blog/${post.id}`} class="group flex flex-col h-full rounded-xl bg-slate-900/5 ring-1 ring-slate-200 overflow-hidden hover:ring-indigo-500/40 hover:bg-indigo-500/5 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-indigo-400/40 dark:hover:bg-white/[0.07] transition">
                  <div class="aspect-[4/3] overflow-hidden">
                    <img src={post.imageUrl} alt={post.title} class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                  </div>
                  <div class="flex flex-1 flex-col p-5 gap-3">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-[10px] uppercase tracking-wider text-indigo-600/70 dark:text-indigo-300/70">Post {post.id}</span>
                      {post.user && <span class="text-[10px] text-slate-500 dark:text-gray-400/70">· {post.user.username}</span>}
                    </div>
                    <h2 class="font-medium leading-snug text-sm text-slate-800 group-hover:text-slate-900 dark:text-gray-100 dark:group-hover:text-white line-clamp-2">{post.title}</h2>
                    <p class="text-[11px] text-slate-600 dark:text-gray-400/80 line-clamp-3">{post.body}</p>
                    <span class="mt-auto pt-2 text-[10px] text-indigo-600/60 group-hover:text-indigo-600 dark:text-indigo-300/60 dark:group-hover:text-indigo-300">Read</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </>
      )
    }
  } finally {
    unsubscribe()
  }
}

Page.is = 'article'
Page.attrs = { class: 'py-10 space-y-12' }

export default Page
