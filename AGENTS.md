# AGENTS.md

AI agent instructions for building applications with Ajo and Ajo-kit. This document provides essential patterns and rules for writing correct Ajo code without mixing concepts from other frameworks.

## Ajo Framework

### Component Model

Ajo uses two distinct component types. Stateless components are pure functions that return JSX and can destructure props and access contexts directly. Stateful components are generator functions that yield JSX repeatedly and have an automatic wrapper element.

**Stateless Component Example**

```javascript
import clsx from 'clsx'
import { context } from 'ajo/context'

const ThemeContext = context('light')

const Card = ({ title, content, isActive }) => {

  const theme = ThemeContext()

  return (
    <div class={clsx('p-4 rounded-lg bg-white dark:bg-gray-800', { 'ring-2 ring-blue-500': isActive })}>
      <h3 class="text-lg font-semibold">{title}</h3>
      <p class="mt-2 text-gray-600 dark:text-gray-300">{content}</p>
    </div>
  )
}
```

**Stateful Component Complete Example**

```javascript
import { context } from 'ajo/context'
import type { Stateful } from 'ajo'

const UserContext = context<{ id: string, name: string } | null>(null)
const FilterContext = context<'all' | 'done'>('all')

const TodoManager: Stateful<{ initialTodos: Array<Todo> }> = function* (args) {

  // Persistent state - defined once before loop
  let todos = [...args.initialTodos]
  let filter = 'all'
  let user = null

  // Persistent methods
  const addTodo = text => {
    // this refers to wrapper element with next, throw, return methods
    this.next(() => todos = [...todos, { id: Date.now(), text, done: false }])
  }

  const toggleTodo = id => {
    this.next(() => todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const changeFilter = newFilter => this.next(() => filter = newFilter)
  
  // Optional cleanup wrapper
  try {

    // Main render loop
    while (true) {

      // Optional error boundary
      try {

        // Fresh destructuring each render
        const { initialTodos } = args

        // Access context inside loop for current value
        user = UserContext()

        // Set context inside loop with current state values
        FilterContext(filter)  // Descendants receive current filter value

        // Derived values
        const filteredTodos = todos.filter(todo => 
          filter === 'all' || (filter === 'done' ? todo.done : !todo.done)
        )

        yield (
          <>
            <div class="mb-4 flex gap-2">
              <button 
                class={clsx({ 'font-bold': filter === 'all' })}
                set:onclick={() => changeFilter('all')}
              >
                All
              </button>
              <button 
                class={clsx({ 'font-bold': filter === 'done' })}
                set:onclick={() => changeFilter('done')}
              >
                Done
              </button>
            </div>
            <ul class="mt-4 space-y-2">
              {filteredTodos.map(todo => (
                <li key={todo.id} class="flex items-center">
                  <input 
                    type="checkbox"
                    checked={todo.done}
                    set:onchange={() => toggleTodo(todo.id)}
                  />
                  <span class={clsx({ 'line-through': todo.done })}>{todo.text}</span>
                </li>
              ))}
            </ul>
            {/* Child components will receive the current filter value */}
            <TodoStats />
          </>
        )
      } catch (renderError) {
        // Recover from render errors
        yield <div class="text-red-500">Error: {renderError.message}</div>
      }
    }
  } finally {
    // Cleanup on unmount
    console.log('Component unmounting')
  }
}
```

### Context Access and Setting

Context values should be both accessed and set inside the while loop of stateful components to ensure fresh values are used and propagated to descendants. Setting context outside the loop would lock the value to the initial state.

```javascript
function* ThemeProvider(args) {

  let theme = 'light'
  let autoMode = false

  const toggleTheme = () => this.next(() => theme = theme === 'light' ? 'dark' : 'light')

  while (true) {

    // Set context inside loop with current state
    ThemeContext(theme)

    // Access other contexts
    const user = UserContext()

    yield (
      <>
        <button set:onclick={toggleTheme}>
          Current theme: {theme}
        </button>
        {args.children}
      </>
    )
  }
}
```

### Wrapper Element and Component Instance

Every stateful component renders inside an automatic wrapper element (default `div`). The `this` context inside the generator refers to this wrapper element, which has been augmented with three methods: `next`, `throw`, and `return`. This wrapper element is a real DOM element that can be used for direct DOM access or event attachment.

```javascript
// Customizing wrapper element
const List: Stateful<{ items: string[] }, 'ul'> = function* (args) {

  // this is the <ul> element with next, throw, return methods
  console.log(this.tagName) // "UL"

  while (true) yield (
    <>
      {args.items.map(item => <li key={item}>{item}</li>)}
    </>
  )
}
List.is = 'ul'  // Must set both TypeScript generic AND .is property

// Default attributes on wrapper
function* Panel() {
  while (true) yield <>Panel content</>
}
Panel.attrs = { 
  class: 'p-4 bg-gray-100 rounded',
  'data-component': 'panel' 
}

// Using the component with both args and wrapper attributes
<TodoManager 
  initialTodos={todos}           // Component args (passed to generator)
  onComplete={handleComplete}    // Component args
  attr:id="main-todos"           // Force attribute on wrapper element
  attr:class="custom-wrapper"    // Force attribute on wrapper
  attr:data-testid="todo-list"   // Force attribute on wrapper
/>
```

### Special Attributes Reference

Special attributes control Ajo's reconciliation and DOM management behavior. Each serves a specific purpose in optimizing rendering or enabling third-party integrations.

**`key` - List reconciliation identity**

```javascript
// Always provide stable unique keys for dynamic lists
{items.map(item => (
  <li key={item.id}>{item.text}</li>
))}
```

**`ref` - DOM element or component instance access**

```javascript
function* FocusManager() {

  let inputEl = null
  
  const focusInput = () => inputEl?.focus()
  
  while (true) yield (
    <>
      <input ref={el => inputEl = el} class="px-2 py-1 border" />
      <button set:onclick={focusInput}>Focus</button>
    </>
  )
}
```

**`memo` - Performance optimization via dependency checking**

```javascript
function* DataView({ userId }) {

  let data = null

  const loadData = async () => {
    const result = await fetch(`/api/data/${userId}`)
    // Must create new reference for memo to detect change
    this.next(() => data = result)
  }

  while (true) yield (
    <>
      <header>User: {userId}</header>
      {/* Only re-renders when data reference changes */}
      <div memo={[data]}>
        <ExpensiveChart data={data} />
      </div>
    </>
  )
}
```

**`skip` - Exclude children from Ajo reconciliation**

```javascript
function* ThirdPartyWidget() {

  let widgetInstance = null

  while (true) yield (
    <div 
      ref={el => {
        if (el) {
          widgetInstance ??= new ExternalLibrary(el)
        } else {
          widgetInstance?.destroy()
          widgetInstance &&= null
        }
      }}
      skip={true}  // Children excluded from Ajo updates
    >
      {/* External library manages this DOM subtree */}
    </div>
  )
}

// Use skip when manually setting innerHTML or textContent
function* RawHtml({ html }) {
  while (true) yield (
    <div 
      set:innerHTML={html}
      skip={true}
    />
  )
}
```

**`set:` - Direct DOM property setting**

```javascript
// Sets properties on DOM elements, not attributes
<input 
  value={text}
  set:oninput={e => handleInput(e)}  // Property, not attribute
  set:disabled={!isValid}            // Property
  set:autofocus={true}               // Property
/>
```

**`attr:` - Force HTML attributes on stateful wrapper**

```javascript
// Only applies to stateful component wrappers
<MyStatefulComponent 
  data={data}                    // Component arg
  onUpdate={handler}             // Component arg
  attr:id="component-1"          // HTML attribute on wrapper
  attr:class="absolute top-0"    // HTML attribute on wrapper
  attr:aria-label="Main widget"  // HTML attribute on wrapper
/>
```

### Async Operations Pattern

Multiple `this.next()` calls are valid and recommended in async operations to show progress states.

```javascript
function* DataProcessor() {

  let status = 'idle'
  let progress = 0

  const process = async () => {

    this.next(() => status = 'loading'; progress = 0)
    const raw = await fetchData()

    this.next(() => status = 'parsing'; progress = 50)
    const parsed = await parseData(raw)

    this.next(() => status = 'complete'; progress = 100)
  }

  while (true) yield (
    <>
      <div>Status: {status}</div>
      <progress class="w-full" value={progress} max="100" />
    </>
  )
}
DataProcessor.attrs = { class: "p-4" }
```

## Ajo-kit Application Structure

### File-Based Routing System

The router maps filesystem structure directly to URL paths by discovering routes from `src/**/{page,layout}.{jsx,tsx}` files. Page files define route endpoints while layout files create nested wrappers that compose hierarchically.

```
src/
  app.tsx             # Router initialization - DO NOT MODIFY
  layout.tsx          # Root layout wrapping all pages
  page.tsx            # Home route (/)
  constants.ts        # Application global constants values, utility functions, types, and contexts
  ui/                 # Global UI components
    button.tsx
    modal.tsx
  
  blog/
    layout.tsx        # Blog section wrapper
    page.tsx          # /blog route
    [id]/
      page.tsx        # /blog/:id dynamic route
    constants.ts      # Blog-specific constants, utilities, types and contexts
    ui/               # Blog-specific UI components
      post-card.tsx
      
  (admin)/            # Route group without URL impact
    layout.tsx        # Admin wrapper (applies to children)
    page.tsx          # /page route (group name excluded from URL)
    dashboard/
      page.tsx        # /dashboard route
    constants.ts      # Admin-specific constants, utilities, types and contexts
    ui/               # Admin-specific UI components
      data-table.tsx
      sidebar.tsx
```

### UI Components Organization

UI components are organized in `ui/` folders at different levels based on their usage scope and sharing requirements. Global components reside in `src/ui/`, while section-specific components are placed in nested `ui/` folders within their respective route directories.

```javascript
// src/ui/button.tsx - Global UI component
import clsx from 'clsx'

export const Button = ({ variant = 'primary', children, onClick }) => (
  <button 
    class={clsx(`px-4 py-2 rounded`, {
      'bg-blue-500 text-white': variant === 'primary',
      'bg-gray-200': variant !== 'primary'
    })}
    set:onclick={onClick}
  >
    {children}
  </button>
)

// src/(admin)/ui/data-table.tsx - Admin-specific component
import type { Stateful } from 'ajo'

export const DataTable: Stateful<{ data: any[] }, 'table'> = function* (args) {

  let sortColumn = null
  let sortDirection = 'asc'

  const sort = (column) => this.next(() => {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortColumn = column
      sortDirection = 'asc'
    }
  })
  
  while (true) {

    const { data } = args
    const sortedData = sortColumn 
      ? [...data].sort((a, b) => {
          const result = a[sortColumn] > b[sortColumn] ? 1 : -1
          return sortDirection === 'asc' ? result : -result
        })
      : data
    
    yield (
      <>
        {/* Table implementation */}
      </>
    )
  }
}
DataTable.is = 'table'
DataTable.attrs = { class: "w-full border-collapse" }
```

### Route Component Contracts

Page components receive router params and define the content for a specific route.

```javascript
// src/blog/[id]/page.tsx
export default function* BlogPost({ params }) {

  const postId = params.id  // From [id] folder name

  let post = null

  fetch(`/api/posts/${postId}`)
    .then(data => this.next(() => post = data))

  while (true) yield (
    <>
      {post ? (
        <>
          <h1>{post.title}</h1>
          <div>{post.content}</div>
        </>
      ) : (
        <div>Loading post {postId}...</div>
      )}
    </>
  )
}
BlogPost.is = 'article'
BlogPost.attrs = { class: "prose max-w-4xl" }
```

Layout components receive children and create wrappers that nest automatically based on filesystem hierarchy.

```javascript
// src/blog/layout.tsx
export default ({ children }) => (
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow px-4">
      <a href="/blog" class="text-blue-600">All Posts</a>
    </nav>
    <main class="py-8">
      {children}
    </main>
  </div>
)
```

### Constants and Context Organization

The `constants.ts` files hold application constants, type definitions, utility functions and context declarations. Place these files at the appropriate scope level based on usage and sharing requirements.

```javascript
// src/constants.ts - Global definitions
import { context } from 'ajo/context'

export const API_URL = import.meta.env.VITE_API_URL
export const MAX_FILE_SIZE = 5 * 1024 * 1024

export const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${units[i]}`
}

export type User = {
  id: string
  name: string
  email: string
}

export const ThemeContext = context<'light' | 'dark'>('light')
export const AuthContext = context<User | null>(null)

// src/(admin)/constants.ts - Section-specific
import { context } from 'ajo/context'

export type ViewMode = 'grid' | 'list' | 'compact'

export const AdminContext = context<{
  viewMode: ViewMode
  sidebarOpen: boolean
}>({
  viewMode: 'grid',
  sidebarOpen: true
})
```

Context values should be set inside the while loop of stateful layout components to ensure descendants receive current state values.

```javascript
// src/(admin)/layout.tsx
import { AdminContext } from './constants'

export default function* AdminLayout({ children }) {

  let viewMode = 'grid'
  let sidebarOpen = true

  const toggleSidebar = () => this.next(() => sidebarOpen = !sidebarOpen)

  while (true) {

    // Set context inside loop with current state
    AdminContext({ viewMode, sidebarOpen })

    yield (
      <div class="flex h-screen">
        <aside class={`bg-gray-900 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
          <button set:onclick={toggleSidebar}>Toggle</button>
        </aside>
        <main class="flex-1">{children}</main>
      </div>
    )
  }
}
```

## Implementation Checklist

When implementing new features or making changes to this ajo-kit application, follow this checklist to ensure correct patterns and avoid common mistakes.

### Pre-Implementation Review

- Identify whether new routes are needed and determine appropriate location in filesystem
- Check if route should be within a group folder for logical organization
- Determine if new contexts are required and identify proper scope level
- Identify reusable UI components and plan their location in ui/ folders
- Review existing components for potential reuse before creating new ones

### Component Implementation

- Don’t import React; JSX is compiled to Ajo via `vite.config.ts`.
- Use stateless components for presentation without internal state
- Use stateful generators for components with state management needs
- Never destructure props in generator function signatures
- Use fragments as root element in stateful components to avoid double wrappers
- Access props via args parameter inside while loop for fresh values
- Set contexts inside while loop when providing state to descendants
- Place persistent state and methods before while loop
- Place derived values and computations inside while loop
- Implement error recovery with try-catch inside while loop when needed
- Implement cleanup with try-finally wrapping while loop when needed

### Styling

- Use UnoCSS with Tailwind-compatible classes (`presetWind4` classes + `i-lucide-*` icons preset)
- Use `clsx` for conditional class merging
- Prefer existing scale and avoid arbitrary value utilities (`class-[...]`) unless a compelling, documented reason (e.g. aspect ratios if no built-in alternative)
- Use standard utilities (`text-xs`, `text-sm`, `text-base`, `from-indigo-500 via-violet-500 to-fuchsia-500`, etc.)
- Always provide dark mode variants where color contrast matters

### DOM and Events

- Use `class` attribute, never `className`
- Use `set:onclick` for event handlers, never `onClick`
- Provide stable unique `key` attributes for all list items
- Use `ref` callbacks to access DOM elements or component instances
- Use `skip={true}` when third-party libraries manage DOM children
- Use `memo` with new object/array references for optimization of DOM sub-trees
- Use `attr:` prefix only for stateful component wrapper attributes

### State Management

- Mutate state directly then call `this.next()` to re-render
- Or use `this.next(cb)` with mutations in callback (better error handling)
- Create new array/object references when using memo dependencies
- Use multiple `this.next()` calls in async operations for progress updates
- Access contexts inside while loop for current values
- Define contexts in appropriate constants.ts file based on scope

### File Organization

- Place page.tsx files for route endpoints
- Place layout.tsx files for section wrappers
- Create ui/ folders at appropriate scope levels
- Define types and contexts in constants.ts files
- Use route groups (parentheses) for organization without URL impact
- Use dynamic segments [param] for variable routes

### Post-Implementation Verification

- Verify no React patterns or imports are present
- Confirm proper use of Ajo-specific attributes and methods
- Check that contexts are accessed and set inside while loops
- Verify memo special attribute dependencies use new references not mutations
- Ensure proper error handling and cleanup where needed
- Confirm UI components are in appropriate ui/ folders
- Test that routes resolve correctly based on filesystem structure

### When In Doubt
- Default to simpler primitives over complex abstractions
- Favor explicit clarity and cleverness
- Keep diffs small for developer-visible conceptual changes
- Ask for opinions and feedback when unsure
