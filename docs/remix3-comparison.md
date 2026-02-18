# ajo-kit vs Remix 3

Comprehensive comparison based on Remix 3 source code (Feb 2026), blog posts, and Remix Jam 2025 demos.

Remix 3 is a ground-up rewrite that dropped React entirely. It has its own component model, JSX runtime, and router — it is a completely different framework from Remix 2 / React Router v7.

---

## Component Model

Both frameworks use a **setup-once, render-many** pattern — but implement it differently.

### Remix 3: Closure + `this.update()`

```typescript
function Counter(this: Remix.Handle) {
  let count = 0;
  return () => (
    <div>
      <p>Count: {count}</p>
      <button on={pressDown(() => { count++; this.update(); })}>
        Increment
      </button>
    </div>
  );
}
```

- Outer function = setup (runs once)
- Inner function = render (called on each update)
- State lives in closure variables — no hooks, no `useState`
- Re-render is **explicit**: mutate variables, call `this.update()`
- `this.signal` is an AbortSignal tied to component lifecycle (aborts on unmount)
- `this.context.set()/get()` for ancestor-descendant data passing
- `this.on(target, listeners)` for auto-cleaned event listeners
- `this.queueTask()` for post-render work

### ajo-kit: Generator + `args.data`

```typescript
const Counter: Stateful<PageArgs<Data>> = function* (args) {
  let count = 0

  while (true) {
    yield (
      <div>
        <p>Server data: {args.data.label}</p>
        <p>Local state: {count}</p>
        <button set:onclick={() => this.next(() => count++)}>Increment</button>
      </div>
    );
  }
}
```

- Generator function = persistent component, yields JSX on each render
- `this.next(fn?)` triggers re-render — optional callback receives current args, runs before next yield
- `this` is the wrapper element with `.next()`, `.throw()`, `.return()` methods
- State lives in closure variables (like Remix 3) AND/OR in `args.data` (server truth via SSE)
- Re-renders happen from two sources: explicit `this.next()` for local state, framework-driven for server data (navigation, SSE patch, action response)
- `try/finally` for cleanup, `try/catch` for error recovery — generator lifecycle is the component lifecycle

### Comparison

| Aspect | Remix 3 | ajo-kit (Ajo) |
|---|---|---|
| Pattern | Closure + render function | Generator yields |
| State location | Closure variables | Closure variables + `args.data` (server) |
| Explicit re-render | `this.update()` | `this.next(fn?)` |
| Framework-driven re-render | No | Yes (SSE patches, navigation) |
| Lifecycle cleanup | `this.signal` (AbortSignal) | `try/finally` in generator |
| Error recovery | Try/catch in setup | `try/catch` inside loop → yield error UI |
| Context system | `this.context.set()/get()` | `context<T>()` factory + read/write in loop |
| External control | No | `ref.next()` from outside the component |
| `this` type | `Remix.Handle` (framework object) | Wrapper DOM element + `.next()/.throw()/.return()` |

**Key similarity**: Both use closure variables for local state and explicit re-render triggers (`this.update()` vs `this.next()`).

**Key difference**: ajo-kit components also receive framework-driven re-renders when server data changes via SSE. Remix 3 components only re-render when explicitly told to. In ajo-kit, `this` is the actual DOM wrapper element (can add event listeners, query children); in Remix 3, `this` is a framework Handle object.

---

## Event System

### Remix 3: `@remix-run/interaction`

Native web events with the `on` prop. No synthetic event system.

```typescript
<button on={pressDown(() => { count++; this.update(); })}>Click</button>
<input on={[dom.input(handleInput), dom.focus(handleFocus)]} />
```

Built-in interactions: `pressDown`, `pressUp`, `press`, `longPress`, `outerPress`, keyboard interactions (`escape`, `enter`, `arrowUp`, etc.), form interactions.

Custom interactions via `defineInteraction()`:

```typescript
const tempo = defineInteraction<HTMLElement, number>('rmx:tempo', ({ target, dispatch }) => {
  // complex event logic...
  dispatch(Math.round(60000 / avg));
});

<button on={tempo((e) => { bpm = e.detail; this.update(); })}>Tap BPM</button>
```

### ajo-kit: Ajo's event binding

Standard DOM events via `set:on*` syntax, combined with `this.next()` for re-renders:

```typescript
<button set:onclick={() => this.next(() => count++)}>Increment</button>
<button set:onclick={action.submit}>Server action</button>
<input set:oninput={(e) => this.next(() => query = e.target.value)} />
```

No interaction abstraction layer — uses browser events directly. `this` is the wrapper element itself (addEventListener works too).

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| Event binding | `on` prop with interaction descriptors | `set:on*` props |
| Accessibility | Built-in (pressDown handles Space/Enter) | Manual |
| Custom patterns | `defineInteraction()` | Custom event handlers |
| Event cleanup | `this.on()` auto-cleans on unmount | `try/finally` in generator + `this.addEventListener` |
| Synthetic events | No | No |

---

## Routing

### Remix 3: Config-Based with Type-Safe URLs

Routes defined in code via `route()`, not file-system:

```typescript
export let routes = route({
  home: '/',
  about: '/about',
  contact: form('contact'),         // GET (display) + POST (action)
  books: {
    index: '/books',
    show: '/books/:slug',
  },
  admin: route('admin', {
    books: resources('books', { param: 'bookId' }),
    users: resources('users', { only: ['index', 'show', 'destroy'] }),
  }),
});

// Type-safe URL generation:
routes.books.show.href({ slug: "gatsby" })  // "/books/gatsby"
```

Helpers: `route()`, `form()`, `resources()`, `resource()`, `get()`, `post()`, `put()`, `del()`.

### ajo-kit: File-System Convention

```
src/
  (public)/
    login/page.tsx          → /login
  (app)/
    dashboard/page.tsx      → /dashboard
    chats/[id]/page.tsx     → /account/chats/:id
    admin/
      users/page.tsx        → /admin/users
```

Route files: `page.tsx`, `layout.tsx`, `handler.ts`, `wares.ts`.

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| Route definition | Code config (`route()`) | File-system convention |
| URL generation | Type-safe `href()` on route objects | Hardcoded strings |
| Named routes | Yes (route object keys) | No |
| Route groups | `route('prefix', { ... })` | `(group)` directories |
| Dynamic params | `:param` in patterns | `[param]` in filenames |
| Catch-all | Standard glob patterns | `[...]` directory |
| Resource routes | `resources()` helper (7 CRUD routes) | Manual in `handler.ts` |
| Form routes | `form()` helper (GET + POST pair) | `actions = {}` in handler |

**ajo-kit advantage**: Zero configuration — routes are the file structure.
**Remix 3 advantage**: Type-safe URL generation prevents broken links at compile time. `resources()` eliminates CRUD boilerplate.

---

## Data Loading

### Remix 3: HTTP Method Handlers

Standard HTTP handlers — no `loader`/`action` naming:

```typescript
export const handlers = {
  async GET({ request, params, url, storage }) {
    const books = await db.select().from('books').where('genre', params.genre);
    return render(<BookList books={books} />);
  },
  async POST({ request, params }) {
    const form = await request.formData();
    await db.insert('books').values({ title: form.get('title') });
    return redirect(routes.books.index.href());
  },
};
```

Data loaded in handlers, rendered to HTML, sent as Response.

### ajo-kit: Loader Pipeline

Separate loaders for layouts and pages:

```typescript
export async function layout(req: Request) {
  req.track?.(`user:${req.user!.id}`)
  return { user: await loadUser(req.user!.id) }
}

export async function page(req: Request) {
  req.track?.([`chat:${chatId}`, `user:${req.user!.id}`])
  return { chat: await loadChat(chatId), messages: await loadMessages(chatId) }
}
```

Data returned as JSON, framework handles serialization and SSR/AJAX branching.

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| Handler naming | HTTP methods: `GET`, `POST`, `PUT`, `DELETE` | `layout()`, `page()`, `head()`, `actions` |
| Return value | `Response` (HTML, JSON, redirect) | Data object (framework serializes) |
| Per-layout data | No separate concept | Yes — each layout has own loader |
| Parallel loading | Manual `Promise.all` | Automatic (layouts load in parallel) |
| Parent data | Via context/storage | `parent()` callback |
| Topic tracking | N/A | `req.track(topic)` |
| Head/meta | Rendered in handler HTML | Separate `head()` loader with merge |

**ajo-kit advantage**: Automatic per-layout data loading, parallel execution, and the data/rendering separation enables SSE-powered live updates.
**Remix 3 advantage**: Standard HTTP semantics — handlers return Responses, making the model explicit and testable with plain `fetch()`.

---

## Mutations

### Remix 3: HTTP Methods + Forms

Standard forms submit to route handlers. `RestfulForm` enables PUT/DELETE:

```typescript
// Handler
async POST({ request }) {
  const form = await request.formData();
  await db.insert('books').values({ title: form.get('title') });
  return redirect(routes.books.index.href());
}

// Component
<form method="post" action={routes.admin.books.create.href()}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

### ajo-kit: Named Actions + `action()` Helper

```typescript
// handler.ts
export const actions = {
  send: async (req: Request) => {
    await insertMessage(req.body.text, req.user!.id);
    emit([`chat:${chatId}`]);
    return { ok: true };
  },
};

// Component
const send = action<{ ok: true }>('send');
<form set:onsubmit={send.submit}>
  <input name="text" />
  <button type="submit">Send</button>
</form>

// Programmatic
await send.invoke({ text: 'Hello!' });
```

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| Mutation mechanism | HTTP method handlers | Named actions in `actions = {}` |
| Client helper | Standard `<form>` | `action<T>('name')` with loading/error states |
| Programmatic invocation | `fetch()` | `action.invoke()` |
| Progressive enhancement | Yes (forms work without JS) | Yes (form fallback) |
| Post-mutation revalidation | Redirect + full page reload | `emit(topics)` → selective SSE patches |
| Action inheritance | No | Yes (ancestor chain lookup) |
| Type safety | Manual | `action<ResponseType>()` |

**ajo-kit advantage**: `emit()` triggers targeted live updates without page reload. Action inheritance lets parent routes provide shared actions.
**Remix 3 advantage**: Standard HTTP forms work without JavaScript. Standard REST semantics (GET/POST/PUT/DELETE).

---

## Live Updates

This is the biggest architectural divergence.

### Remix 3: Frame (HTML-over-the-Wire)

No built-in SSE or real-time pub/sub. Partial updates use `<Frame>`:

```typescript
<Frame src={routes.fragments.bookCard.href({ slug })} fallback={<Loading />} />
```

- Frame fetches HTML fragments from the server
- A hybrid reconciler (idiomorph-inspired) morphs HTML into existing DOM
- Frames can independently refresh — only the fragment is re-fetched
- Frames are nestable
- This is the "HTML as wire format" approach (vs RSC's JSON streams)

For true real-time, you'd build it yourself (WebSockets, SSE, etc.).

### ajo-kit: Topic-Based SSE with JSON Patches

Built-in, zero-config real-time:

```typescript
// Loader tracks topics
export async function page(req: Request) {
  req.track?.([`chat:${chatId}`, `user:${userId}`]);
  return { messages: await loadMessages(chatId) };
}

// Mutation emits topics
export const actions = {
  send: async (req) => {
    await insertMessage(...);
    emit([`chat:${chatId}`, ...participantTopics]);
    return { ok: true };
  },
};
```

Flow: `track()` → `emit()` → server re-runs affected loaders → diffs → JSON patches via SSE → client applies patches → re-render.

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| Built-in real-time | No | Yes (SSE + JSON patches) |
| Partial updates | `<Frame>` (HTML fragments) | SSE patches on `args.data` |
| Wire format | HTML | JSON patches |
| Topic pub/sub | N/A | `track()` / `emit()` |
| Auto-revalidation | No (manual Frame refresh) | Yes (affected loaders re-run) |
| Setup complexity | DIY | Zero config |
| Scaling | N/A | Sticky sessions (in-process) |

**ajo-kit advantage**: Live updates are a first-class framework feature. `track()` + `emit()` is all you need.
**Remix 3 advantage**: Frame is simpler for one-off partial updates. No SSE connection overhead for apps that don't need real-time.

---

## Middleware

### Remix 3: `async (context, next)` Pattern

```typescript
async function requireAuth(context, next) {
  const user = await getUserFromSession(context);
  if (!user) return redirect('/login');
  context.storage.set('currentUser', user);
  return next();
}

// Global
const router = createRouter({ middleware: [compression, logging] });

// Router-level
router.use(storeContext);

// Route-level (alongside handlers)
router.map(routes.admin, { middleware: [requireAuth], ...adminHandlers });
```

### ajo-kit: File-Based `wares.ts`

```typescript
// src/wares.ts — applies to ALL routes
export default [session(), csrf] satisfies Middleware[]

// src/(app)/admin/wares.ts — applies to /admin/* only
export default [role('admin')]
```

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| Definition | Code-based (`router.use()`, handler options) | File-based (`wares.ts`) |
| Inheritance | Explicit (global → router → route) | Automatic (parent directory → child) |
| `next()` pattern | Yes (`async (ctx, next)`) | Yes (polka middleware pattern) |
| Context passing | `context.storage.set()/get()` | `req.user`, `req.*` (mutate request) |
| Scoping | Explicit via `router.map()` options | Implicit via directory structure |

**ajo-kit advantage**: Middleware inheritance from directory structure — zero config for subtree scoping.
**Remix 3 advantage**: Explicit control over middleware order and scope. Type-safe context storage.

---

## SSR and Hydration

### Remix 3

- Custom `renderToStream()` with segment tree (Static, Composite, Frame segments)
- Blocking vs non-blocking frames for streaming
- Selective hydration via `hydrated()` — only interactive components get JS
- HTML comment markers (`rmx:h:{id}`) mark hydration boundaries
- `<head>` tags intercepted from anywhere in tree and collected
- CSS aggregated into single `<style data-rmx-styles>` tag

### ajo-kit

- Custom SSR rendering via Ajo's JSX-to-HTML
- Full AJAX (JSON) or SSR (HTML) response based on request type
- Head management via `head()` loader with automatic merge/dedup
- Hydration of generator components preserves state

### Comparison

| Aspect | Remix 3 | ajo-kit |
|---|---|---|
| SSR engine | Custom segment tree + streaming | Ajo JSX-to-HTML |
| Hydration | Selective (`hydrated()`) | Full (all generator components) |
| Streaming | Yes (blocking + non-blocking frames) | No |
| Head management | Intercepted from anywhere in tree | `head()` loader with merge |
| CSS strategy | Aggregated `<style>` tag with `@layer` | Standard build-time CSS |

---

## Package Architecture

### Remix 3: Composable Monorepo (~20 packages)

| Package | Role |
|---|---|
| `@remix-run/component` | Component model, JSX runtime, reconciler, Frame, streaming |
| `@remix-run/interaction` | Event interactions (press, keyboard, form, popover) |
| `@remix-run/fetch-router` | Type-safe Fetch API router |
| `@remix-run/route-pattern` | URL pattern matching |
| `@remix-run/node-fetch-server` | Node.js server adapter |
| `@remix-run/response` | Response helpers (HTML, redirect, file, compress) |
| `@remix-run/headers` | HTTP header utilities |
| `@remix-run/html-template` | XSS-safe HTML templating |
| `@remix-run/cookie` | Cookie parsing/signing |
| `@remix-run/session` | Session management |
| `@remix-run/session-middleware` | Session cookie middleware |
| `@remix-run/data-schema` | Schema validation |
| `@remix-run/form-data-parser` | Multipart form parsing |
| `@remix-run/file-storage` | File upload storage |
| `@remix-run/compression-middleware` | Response compression |
| `@remix-run/async-context-middleware` | AsyncLocalStorage context |
| `remix` | Unified distribution (re-exports all) |

### ajo-kit: Focused Core (~3 packages)

| Package | Role |
|---|---|
| `ajo-kit` | Full framework (router, SSR, loaders, actions, SSE, database) |
| `ajo-auth` | Auth, sessions, guards, CSRF |
| `ajo-backup` | Google Drive backup tooling |

**Remix 3**: Many small composable packages, individually replaceable. ~15+ packages.
**ajo-kit**: Integrated framework with plugin discovery. ~3 packages, ~2000 LOC total.

---

## Philosophical Differences

| Principle | Remix 3 | ajo-kit |
|---|---|---|
| Component control | Developer controls state + renders | Developer controls local state (`this.next()`), framework controls server data renders |
| Wire format | HTML fragments (Frame) | JSON patches (SSE) |
| Route definition | Explicit code config | Implicit file convention |
| Real-time | DIY (no built-in) | First-class (`track`/`emit`) |
| Composability | Many small packages | Integrated single framework |
| Runtime target | Any JS runtime (Node, Bun, Deno, CF Workers) | Node.js (polka + better-sqlite3) |
| React dependency | None (custom component model) | None (Ajo components) |
| Testing | `router.fetch(new Request(...))` | Dev server + manual |
| LLM optimization | Explicit principle (#1) | Not a stated goal |

---

## Where Each Excels

### Remix 3 is stronger for:
- **Composable architecture** — replace any layer without framework lock-in
- **Type-safe routing** — `href()` catches broken links at compile time
- **Resource routes** — `resources()` generates 7 CRUD routes in one line
- **Edge deployment** — runs on CF Workers, Deno, Bun natively
- **Progressive enhancement** — HTML forms work without JS by default
- **Interaction system** — accessible press/keyboard handling built-in
- **Animation** — built-in spring/tween with enter/exit/layout animations
- **Testing** — standard `fetch()` for handler tests, no server needed

### ajo-kit is stronger for:
- **Live updates** — zero-config SSE with topic pub/sub, no DIY
- **Data flow clarity** — `args.data` is always server truth
- **Per-layout data** — each layout loads independently and in parallel
- **File-based convention** — no route configuration to maintain
- **Middleware colocation** — `wares.ts` shows exactly what applies where
- **Action inheritance** — parent routes provide shared actions to children
- **Head management** — `head()` loader with automatic merge
- **Simplicity** — ~2000 LOC, one convention to learn

---

## Sources

- [Wake up, Remix!](https://remix.run/blog/wake-up-remix)
- [Remix Jam 2025 Recap](https://remix.run/blog/remix-jam-2025-recap)
- [Remix 3 Resources (Mark Dalgleish)](https://github.com/markdalgleish/remix3-resources)
- [Bookstore Demo](https://github.com/remix-run/remix/tree/main/demos/bookstore)
- [Remix 3: what's changing (Appwrite)](https://appwrite.io/blog/post/remix-3-whats-changing-and-why-it-matters)
- [Thoughts on Remix 3 (frantic.im)](https://frantic.im/remix-3/)
- [Remix 3 Beyond React (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/remix-3-beyond-react/)
- [Remix 3 ditched React (LogRocket)](https://blog.logrocket.com/remix-3-ditched-react/)
- [@remix-run/dom docs (Kent C. Dodds gist)](https://gist.github.com/kentcdodds/d8903f6c51763aa8d681af2982b90831)
- [remix-run/remix (GitHub)](https://github.com/remix-run/remix)
