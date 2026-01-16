# AGENTS.md

AI agent instructions for building applications with Ajo and Ajo-kit. This document provides essential patterns and rules for writing correct Ajo code without mixing concepts from other frameworks.

## Ajo Framework

Ajo is a micro UI library using JSX and generators. **No React imports**: JSX compiles to Ajo via build config.

### Component Model

Ajo uses two distinct component types. Stateless components are pure functions that return JSX and can destructure props and access contexts directly. Stateful components are generator functions that yield JSX repeatedly and have an automatic wrapper element.

**Stateless Component**

```typescript
import type { Children, Stateless } from 'ajo'
import clsx from 'clsx'
import { context } from 'ajo/context'

const ThemeContext = context<'light' | 'dark'>('light')

type CardArgs = { title: string; content: string; isActive?: boolean; children?: Children }

const Card: Stateless<CardArgs> = ({ title, content, isActive, children }) => {

  const theme = ThemeContext()  // Read context value (stateless = read only)

  return (
    <div class={clsx('p-4 rounded-lg bg-white dark:bg-gray-800', { 'ring-2 ring-blue-500': isActive })}>
      <h3 class="text-lg font-semibold">{title}</h3>
      <p class="mt-2 text-gray-600 dark:text-gray-300">{content}</p>
      {children}
    </div>
  )
}

// Usage - everything goes to args:
<Card title="Hello" isActive>
  <p>Card content here.</p>
</Card>
```

**Stateful Component**

```typescript
import type { Stateful } from 'ajo'
import { context } from 'ajo/context'
import clsx from 'clsx'

type Todo = { id: number; text: string; done: boolean }

const UserContext = context<{ id: string; name: string } | null>(null)
const FilterContext = context<'all' | 'done'>('all')

type TodoManagerArgs = { initialTodos: Todo[]; step?: number }

const TodoManager: Stateful<TodoManagerArgs, 'section'> = function* (args) {  // Do NOT destructure args here

  // Before loop: persistent state & handlers

  let todos = [...args.initialTodos]
  let filter: 'all' | 'done' = 'all'
  let inputRef: HTMLInputElement | null = null

  // Persistent methods - use this.next() to trigger re-render
  const addTodo = (text: string) => {
    this.next(() => todos = [...todos, { id: Date.now(), text, done: false }])
  }

  // this.next(fn) can access current args
  const addMultiple = () => this.next(({ step = 1 }) => {
    for (let i = 0; i < step; i++) todos.push({ id: Date.now() + i, text: `Todo ${i}`, done: false })
  })

  const toggleTodo = (id: number) => {
    this.next(() => todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const changeFilter = (newFilter: 'all' | 'done') => this.next(() => filter = newFilter)

  // this = wrapper element, can add event listeners
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && inputRef?.value) {
      addTodo(inputRef.value)
      inputRef.value = ''
    }
  }
  this.addEventListener('keydown', handleKeydown)

  try {  // Optional: cleanup wrapper

    while (true) {  // Main render loop

      try {  // Optional: error boundary

        // Fresh destructure each render
        const { step = 1 } = args

        // Access context inside loop for current value
        const user = UserContext()

        // Set context inside loop with current state values
        FilterContext(filter)  // Descendants receive current filter value

        // Derived values
        const filteredTodos = todos.filter(todo =>
          filter === 'all' || (filter === 'done' ? todo.done : !todo.done)
        )

        yield (
          <>
            <div class="mb-4 flex gap-2">
              <input
                ref={el => inputRef = el}
                placeholder="New todo..."
                set:oninput={e => this.next()}  // Re-render on input
              />
              <button
                class={clsx('px-2', { 'font-bold': filter === 'all' })}
                set:onclick={() => changeFilter('all')}
              >
                All
              </button>
              <button
                class={clsx('px-2', { 'font-bold': filter === 'done' })}
                set:onclick={() => changeFilter('done')}
              >
                Done
              </button>
            </div>
            <ul class="mt-4 space-y-2">
              {filteredTodos.map(todo => (
                <li key={todo.id} class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    set:onchange={() => toggleTodo(todo.id)}
                  />
                  <span class={clsx({ 'line-through': todo.done })}>{todo.text}</span>
                </li>
              ))}
            </ul>
            <p memo={[todos.length]}>Total: {todos.length}</p>
            <footer memo>Static content - rendered once</footer>
          </>
        )
      } catch (err: unknown) {
        yield <p class="text-red-500">{err instanceof Error ? err.message : String(err)}</p>
      }
    }
  } finally {
    this.removeEventListener('keydown', handleKeydown)
  }
}

TodoManager.is = 'section'                    // Wrapper element (default: div)
TodoManager.attrs = { class: 'todo-manager' } // Default wrapper attributes
TodoManager.args = { step: 1 }                // Default args

// Usage - special attrs apply to wrapper, rest goes to args:
let ref: ThisParameterType<typeof TodoManager> | null = null

<TodoManager
  initialTodos={[]} step={5}                  // → args
  attr:id="main" attr:class="my-todos"        // → wrapper attributes (HTML attrs)
  set:onclick={fn}                            // → wrapper properties (DOM props)
  key={id}                                    // → wrapper key
  memo={[id]}                                 // → wrapper memo (array)
  ref={el => ref = el}                        // → wrapper ref (el is <section> + .next()/.throw()/.return())
/>

ref?.next()  // Trigger re-render from outside
```

### Rules Quick Reference

| Topic | Rule |
|-------|------|
| **Elements** | Everything becomes HTML attributes. `set:prop` assigns DOM properties instead (`node[prop] = value`) |
| **Stateless** | Everything goes to `args`. Special attrs like `memo` must be applied to elements inside |
| **Stateful** | `key`, `memo`, `skip`, `ref`, `set:*` apply to implicit wrapper element. `attr:*` sets wrapper attributes. Rest goes to `args` |
| **Events** | `set:onclick`, `set:oninput`, etc. Never `onClick` |
| **Classes** | `class`, never `className`. Must be string, no object/array syntax. Use `clsx()` or template literals |
| **Styles** | `style` must be string (`style="color: red"`), not object. No special handling |
| **Args** | Never destructure in generator signature. Use `args` param |
| **Root JSX** | Use `<>...</>` in stateful to avoid double wrapper |
| **Re-render** | `this.next()` or `this.next(fn)` where `fn` receives current `args` |
| **Context** | `context<T>(fallback)` creates context. Stateless: read only. Stateful: read/write inside `while` loop |
| **Lists** | Always provide unique `key` on elements |
| **Refs** | `ref={el => ...}` on elements. Receives `null` on unmount. Stateful ref type: `ThisParameterType<typeof Component>` |
| **Memo** | `memo={[deps]}` array, `memo={value}` single, or just `memo` (never re-render). Skips subtree if unchanged |
| **Skip** | `skip` excludes children from reconciliation. Use for `set:textContent`/`set:innerHTML` or third-party managed DOM |
| **Custom wrapper** | Set `.is = 'tagname'` AND TypeScript generic `Stateful<Args, 'tagname'>` for stateful components. Default is `div` |
| **Default attrs** | `.attrs = { class: '...' }` on stateful component generator function |
| **Default args** | `.args = { prop: value }` on stateful component generator function |
| **Cleanup** | `try { while(true) yield ... } finally { cleanup }` |
| **Error recovery** | `try { ... } catch { yield error UI }` inside loop |
| **this** | Stateful component wrapper element with `.next()`, `.throw()`, `.return()`. Type: `ThisParameterType<typeof Component>` |

### Special Attributes

**`set:` - DOM properties vs HTML attributes**

```typescript
// HTML Attributes (default) vs DOM Properties (set:)
<input value="text" />                       // HTML attribute: initial value only
<input set:value={text} />                   // DOM property: syncs with state

<input type="checkbox" checked />            // HTML attribute: initial state
<input type="checkbox" set:checked={bool} /> // DOM property: syncs with state

// Events - always use set:
<input set:oninput={e => handleInput(e)} />
<button set:onclick={handleClick} />

// Other DOM properties
<video set:currentTime={0} set:muted />
<div set:textContent={str} skip />           // DOM property + skip (required!)
<div set:innerHTML={html} skip />            // DOM property + skip (required!)

// Boolean attributes
<input type="checkbox" checked disabled />   // checked="" disabled=""
<button disabled={false} />                  // removes disabled attr
```

**`memo` - Performance optimization**

```typescript
<div memo={[a, b]}>{/* re-render when a or b changes (array) */}</div>
<div memo={count}>{/* re-render when count changes (single value) */}</div>
<div memo>{/* render once, never update - good for static content */}</div>
```

**`skip` - Third-party DOM or innerHTML**

```typescript
// Third-party library manages DOM
<div skip ref={el => el ? (widget ??= new Library(el)) : widget?.destroy()} />

// innerHTML/textContent (skip required!)
<div set:innerHTML={html} skip />
```

**`attr:` - Force wrapper attributes**

```typescript
// Only for stateful component wrappers
<MyComponent data={data} attr:id="main" attr:class="wrapper" attr:aria-label="Widget" />
```

### Anti-patterns

```typescript
// ❌ React patterns - NEVER use
import React from 'react'
className="..."
onClick={...}
useState, useEffect, useCallback

// ❌ class/style as object or array
<div class={{ active: isActive }} />        // won't work
<div class={['btn', 'primary']} />          // won't work
<div style={{ color: 'red' }} />            // won't work

// ✅ class/style must be strings
<div class={clsx('btn', { active: isActive })} />
<div style="color: red" />
<div style={`color: ${color}`} />

// ❌ Destructure in generator signature
function* Bad({ count }) { ... }            // locks to initial values

// ❌ Context outside loop in stateful
function* Bad(args) {
  const theme = ThemeContext()              // frozen at mount
  ThemeContext('dark')                      // only set once
  while (true) yield ...
}

// ✅ Context inside loop
function* Good(args) {
  while (true) {
    ThemeContext(theme)                     // write: updated each render
    const user = UserContext()              // read: fresh value each render
    yield ...
  }
}

// ❌ Other common mistakes
{items.map(item => <li>{item}</li>)}        // missing key
const inc = () => count++                   // without this.next()
<div set:innerHTML={html} />                // missing skip

// ✅ Correct
{items.map(item => <li key={item.id}>{item}</li>)}
const inc = () => this.next(() => count++)
<div set:innerHTML={html} skip />
```

## Ajo-kit Application Structure

### File-Based Routing

The router maps filesystem structure directly to URL paths by discovering routes from `src/**/{page,layout}.{jsx,tsx}` files.

```
src/
  app.tsx             # Router initialization - DO NOT MODIFY
  layout.tsx          # Root layout wrapping all pages
  page.tsx            # Home route (/)
  constants.ts        # Global constants, utility functions, types, and contexts
  ui/                 # Global UI components

  handler.ts          # /api root handler
  wares.ts            # /api root middlewares (runs before all /api/**)

  blog/
    layout.tsx        # Blog section wrapper
    page.tsx          # /blog route
    [id]/
      page.tsx        # /blog/:id dynamic route
    constants.ts      # Blog-specific constants, utilities, types and contexts
    ui/               # Blog-specific UI components

  (admin)/            # Route group without URL impact
    layout.tsx        # Admin wrapper (applies to children)
    page.tsx          # / route (group name excluded from URL)
    dashboard/
      page.tsx        # /dashboard route
    constants.ts
    ui/

  users/
    wares.ts          # /api/users/** middlewares
    [id]/
      handler.ts      # /api/users/:id
```

**Route conventions:**
- `page.tsx` = route endpoint
- `layout.tsx` = wrapper (nests automatically)
- `[param]` = dynamic segment → `:param`
- `(group)` = organization only, excluded from URL
- `[...]` = catch-all → `*`

### File-Based APIs

The server discovers API files from `src/**/{wares,handler}.{js,ts}` and mounts them under `/api`.

**handler.ts** - exports object mapping HTTP verbs to handlers:

```ts
// src/ping/handler.ts  -> GET /api/ping
import type { Request } from 'polka'

export default {
  get: (_req: Request) => ({ ok: true }),
  post: async (req: Request) => { /* ... */ },
}
```

**wares.ts** - exports middleware(s), compose root → leaf:

```ts
// src/wares.ts -> applies to all /api/**
import type { Request, Response, NextHandler } from 'polka'

export default (req: Request, res: Response, next: NextHandler) => {
  // middleware logic
  next()
}
// Or array: export default [middleware1, middleware2]
```

**Serialization:** If handler returns a value (and hasn't ended response), `@polka/send` serializes it (JSON for objects/arrays, text for strings).

### Route Components

**Page** - receives `{ params }`:

```typescript
// src/blog/[id]/page.tsx
export default function* BlogPost({ params }) {
  const postId = params.id
  let post = null

  fetch(`/api/posts/${postId}`)
    .then(r => r.json())
    .then(data => this.next(() => post = data))

  while (true) yield (
    <>
      {post ? (
        <article>
          <h1>{post.title}</h1>
          <div>{post.content}</div>
        </article>
      ) : (
        <div>Loading...</div>
      )}
    </>
  )
}
BlogPost.is = 'article'
BlogPost.attrs = { class: 'prose max-w-4xl' }
```

**Layout** - receives `{ children }`:

```typescript
// src/blog/layout.tsx
export default ({ children }) => (
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow px-4">
      <a href="/blog" class="text-blue-600">All Posts</a>
    </nav>
    <main class="py-8">{children}</main>
  </div>
)
```

**Stateful Layout** - set context inside loop:

```typescript
// src/(admin)/layout.tsx
import { AdminContext } from './constants'

export default function* AdminLayout({ children }) {
  let sidebarOpen = true
  const toggle = () => this.next(() => sidebarOpen = !sidebarOpen)

  while (true) {
    AdminContext({ sidebarOpen })  // Set context inside loop!

    yield (
      <div class="flex h-screen">
        <aside class={sidebarOpen ? 'w-64' : 'w-16'}>
          <button set:onclick={toggle}>Toggle</button>
        </aside>
        <main class="flex-1">{children}</main>
      </div>
    )
  }
}
```

### Constants and Context Organization

Place `constants.ts` files at appropriate scope levels:

```typescript
// src/constants.ts - Global
import { context } from 'ajo/context'

export const API_URL = import.meta.env.VITE_API_URL

export type User = { id: string; name: string; email: string }

export const ThemeContext = context<'light' | 'dark'>('light')
export const AuthContext = context<User | null>(null)

// src/(admin)/constants.ts - Section-specific
export const AdminContext = context<{ sidebarOpen: boolean }>({ sidebarOpen: true })
```

## Styling

- UnoCSS with Tailwind-compatible classes (`presetWind4` + `i-lucide-*` icons)
- `clsx` for conditional class merging
- Prefer standard utilities, avoid arbitrary values (`[...]`) unless necessary
- Dark mode variants where color contrast matters

## Implementation Checklist

### Before implementing
- Route location and grouping strategy
- Context scope (global vs section `constants.ts`)
- Check existing `ui/` folders for reusable components

### Component rules
- No React imports/patterns
- Stateful: don't destructure `args`, context inside loop, `<>` root
- Events: `set:onclick` not `onClick`
- Lists: unique `key`
- `skip` with `set:innerHTML`/`set:textContent`
- `.is`, `.attrs`, `.args` for wrapper customization

### After implementing
- No React patterns present
- Contexts accessed/set inside `while` loops
- Routes resolve correctly
- APIs reachable at `/api/**`
- Wares compose root → leaf correctly
