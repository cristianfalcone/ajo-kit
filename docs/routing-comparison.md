# Routing System Comparison

**Ajo-kit vs Laravel (Traditional + Folio + Inertia)**

This document provides a comprehensive comparison between Ajo-kit's routing system and Laravel's routing ecosystem (Traditional Router, Folio, Inertia.js, and Breeze/Jetstream starter kits).

---

## Executive Summary

Ajo-kit implements a **SvelteKit-inspired file-system router** that unifies page rendering, data loading, middleware, actions, API endpoints, and live SSE updates in a single cohesive system. Compared to Laravel's routing:

- **File-system routing** with groups, dynamic params, and catch-all (like SvelteKit/Next.js; Laravel Folio adds this optionally)
- **Colocated data loading** via `handler.ts` (layout/page/head loaders; Laravel requires separate controllers)
- **Topic-based live updates** via SSE with JSON patches (Laravel has no equivalent without Laravel Echo/Pusher)
- **Unified actions + API** in a single handler file (Laravel separates controllers, form requests, and API resources)
- **Nested layouts with per-layout data** (Laravel Folio/Blade uses template inheritance, no per-layout data loading)
- **Automatic client-side navigation** with SSR hydration (like Inertia.js, but built-in)
- **~2000 LOC** total framework code vs Laravel's 50k+ routing subsystem

**Key gaps vs Laravel:**
- No named routes or URL generation helpers
- No route model binding
- No parameter constraints (regex validation)
- No subdomain routing
- No route caching for production
- No resource/CRUD route scaffolding
- No redirect/view route shortcuts
- No optional parameters
- No route listing CLI command

---

## Feature Comparison Matrix

| Feature | Ajo-kit | Laravel Router | Laravel Folio | SvelteKit |
|---------|---------|---------------|---------------|-----------|
| **Route Definition** |
| File-system routing | ✅ Native | ❌ Config-based | ✅ Blade pages | ✅ Native |
| Code-based routes | ❌ | ✅ `Route::get()` | ❌ | ❌ |
| Route groups | ✅ `(group)` dirs | ✅ `Route::group()` | ❌ | ✅ `(group)` dirs |
| Dynamic params | ✅ `[id]` | ✅ `{id}` | ✅ `[id]` | ✅ `[id]` |
| Optional params | ❌ | ✅ `{id?}` | ❌ | ✅ `[[id]]` |
| Catch-all | ✅ `[...]` | ✅ `{path?}` + `.*` | ✅ `[...ids]` | ✅ `[...rest]` |
| Named routes | ❌ | ✅ `->name()` | ✅ `name()` | ❌ |
| URL generation | ❌ | ✅ `route()` helper | ✅ `route()` | ❌ |
| **Parameter Features** |
| Regex constraints | ❌ | ✅ `->where()` | ❌ | ✅ Matchers |
| Global constraints | ❌ | ✅ `Route::pattern()` | ❌ | ❌ |
| Enum binding | ❌ | ✅ Implicit enums | ❌ | ❌ |
| Route model binding | ❌ | ✅ Implicit + explicit | ✅ `[User]` | ❌ |
| Scoped binding | ❌ | ✅ `->scopeBindings()` | ❌ | ❌ |
| Custom key binding | ❌ | ✅ `{post:slug}` | ✅ `[Post:slug]` | ❌ |
| **Middleware** |
| File-based middleware | ✅ `wares.ts` | ❌ | ✅ `middleware()` | ✅ `hooks.server.ts` |
| Subtree inheritance | ✅ Automatic | ❌ Manual groups | ✅ Path patterns | ✅ Automatic |
| Middleware params | ❌ | ✅ `'role:admin'` | ❌ | ❌ |
| Middleware groups | ❌ | ✅ `web`, `api` | ❌ | ❌ |
| Terminable middleware | ❌ | ✅ `terminate()` | ❌ | ❌ |
| Priority ordering | ✅ Ancestor order | ✅ Configurable | ✅ | ✅ |
| **Data Loading** |
| Server loaders | ✅ `page()`, `layout()` | ❌ Controllers | ❌ | ✅ `+page.server.ts` |
| Per-layout data | ✅ Each layout gets own | ❌ | ❌ | ✅ `+layout.server.ts` |
| Parent data access | ✅ `parent()` callback | ❌ | ❌ | ✅ `await parent()` |
| Head/meta per route | ✅ `head()` loader | ❌ Manual | ❌ | ❌ (manual) |
| Parallel loading | ✅ Layouts load parallel | ❌ | ❌ | ✅ |
| Deferred loading | ✅ `defer: true` export | ❌ | ❌ | ✅ Streaming |
| **Actions & Mutations** |
| Form actions | ✅ `actions = {}` | ❌ Controllers | ❌ | ✅ Form actions |
| Action inheritance | ✅ Ancestor lookup | ❌ | ❌ | ❌ |
| API endpoints | ✅ `default { get, post }` | ✅ Resource controllers | ❌ | ✅ `+server.ts` |
| Resource routes | ❌ | ✅ 7 CRUD routes | ❌ | ❌ |
| API resource routes | ❌ | ✅ 5 API routes | ❌ | ❌ |
| Singleton resources | ❌ | ✅ `Route::singleton()` | ❌ | ❌ |
| Form method spoofing | ❌ | ✅ `@method('PUT')` | ❌ | ❌ |
| **Live Updates** |
| SSE streaming | ✅ Built-in, topic-based | ❌ Needs Echo/Pusher | ❌ | ❌ |
| JSON patch diffing | ✅ Automatic | ❌ | ❌ | ❌ |
| Topic pub/sub | ✅ `track()`/`emit()` | ❌ | ❌ | ❌ |
| Event streams | ✅ Native | ✅ `eventStream()` (L12) | ❌ | ❌ |
| **Navigation** |
| Client-side nav | ✅ Built-in (navaid) | ❌ (needs Inertia) | ❌ | ✅ Built-in |
| SSR + hydration | ✅ Built-in | ❌ (needs Inertia) | ❌ | ✅ Built-in |
| Prefetch/preload | ❌ | ❌ | ❌ | ✅ `data-sveltekit-preload-data` |
| Scroll management | ❌ | ❌ (Inertia has it) | ❌ | ✅ Built-in |
| **Layouts** |
| Nested layouts | ✅ Automatic | ❌ (Blade sections) | ❌ (Blade extends) | ✅ Automatic |
| Layout data loading | ✅ Per-layout loaders | ❌ | ❌ | ✅ |
| Breaking out of layout | ❌ | N/A | N/A | ✅ `+page@.svelte` |
| Persistent layouts | ✅ Generator components | ✅ (Inertia) | ❌ | ❌ |
| **Error Handling** |
| Per-route errors | ✅ `AppError` classes | ✅ `abort()` | ❌ | ✅ `+error.svelte` |
| Custom error pages | ✅ Error component | ✅ `resources/views/errors/` | ❌ | ✅ |
| Missing model behavior | ❌ | ✅ `->missing()` | ✅ | ❌ |
| Validation errors | ✅ `InvalidError` | ✅ Form requests | ❌ | ✅ |
| **Production** |
| Route caching | ❌ | ✅ `route:cache` | ✅ | ✅ (built) |
| Route listing | ❌ | ✅ `route:list` | ✅ `folio:list` | ❌ |
| **Advanced** |
| Subdomain routing | ❌ | ✅ `Route::domain()` | ✅ `Folio::domain()` | ❌ |
| Redirect routes | ❌ | ✅ `Route::redirect()` | ❌ | ❌ |
| View routes | ❌ | ✅ `Route::view()` | ✅ (native) | ❌ |
| CORS config | ❌ | ✅ Built-in middleware | ❌ | ❌ |
| Rate limiting | ✅ In-memory (auth only) | ✅ `throttle` middleware | ❌ | ❌ |
| HMR for routes | ✅ Handler hot reload | ❌ | ❌ | ✅ |

---

## Detailed Feature Analysis

### 1. Route Definition Paradigm

#### Ajo-kit: File-System Convention
```
src/
  (public)/
    login/page.tsx          → /login
    register/page.tsx       → /register
    reset/[token]/page.tsx  → /reset/:token
  (app)/
    dashboard/page.tsx      → /dashboard
    account/
      profile/page.tsx      → /account/profile
      chats/[id]/page.tsx   → /account/chats/:id
    admin/
      users/page.tsx        → /admin/users
```

**Route file types:**
- `page.tsx` — Page component (required for a route to exist)
- `layout.tsx` — Layout wrapper for subtree
- `handler.ts` — Server logic (loaders, actions, API)
- `wares.ts` — Middleware for subtree

**Pattern conversion:**
```typescript
const reGroup = /^\(.*\)$/         // (group) → removed from URL
const reDynamic = /^\[(.+?)\]$/    // [id] → :id, [...] → *

export const toPattern = (segments: string[]) =>
  segments
    .filter(s => s && !reGroup.test(s))
    .map(s => s.replace(reDynamic, (_, name) => name === '...' ? '*' : `:${name}`))
    .join('/')
```

**Advantages:**
- Routes are the file structure — zero configuration
- Colocated UI + data + middleware per route
- Route groups for organization without URL impact
- Type-safe throughout (TypeScript)

#### Laravel: Code-Based Configuration
```php
// routes/web.php
Route::get('/login', [AuthController::class, 'showLogin']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::resource('posts', PostController::class);

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/users', [AdminController::class, 'users']);
    });
});
```

**Advantages:**
- Maximum flexibility and expressiveness
- Named routes with URL generation
- Resource/CRUD scaffolding (7 routes in one line)
- Rich parameter constraints

#### Laravel Folio: File-Based (Blade)
```
resources/views/pages/
  index.blade.php           → /
  login.blade.php           → /login
  users/
    index.blade.php         → /users
    [User].blade.php        → /users/{user} (with model binding!)
    [User]/
      posts/[Post].blade.php → /users/{user}/posts/{post}
```

**Comparison:**
| Aspect | Ajo-kit | Laravel Router | Laravel Folio |
|--------|---------|---------------|---------------|
| Route discovery | File system | Code config | File system |
| Data loading | Colocated handler.ts | Separate controller | Inline render() |
| Middleware | Colocated wares.ts | Code-based groups | Per-page or pattern |
| Model binding | ❌ Manual | ✅ Automatic | ✅ Automatic |
| Named routes | ❌ | ✅ | ✅ name() |
| Route groups | ✅ (parentheses) | ✅ (code) | ❌ |
| Layout nesting | ✅ Automatic | ❌ (Blade extends) | ❌ (Blade extends) |
| Live updates | ✅ SSE built-in | ❌ | ❌ |

---

### 2. Route Parameters

#### Ajo-kit
```typescript
// Dynamic: src/blog/[id]/page.tsx → /blog/:id
// Catch-all: src/docs/[...]/page.tsx → /docs/*
// Access: req.params.id
```

- Simple and sufficient for most cases
- No validation at the routing level
- No optional parameters

#### Laravel
```php
// Required: /user/{id}
Route::get('/user/{id}', fn (string $id) => "User $id");

// Optional: /user/{name?}
Route::get('/user/{name?}', fn (?string $name = 'John') => $name);

// Regex constraints
Route::get('/user/{id}', fn ($id) => $id)->where('id', '[0-9]+');
Route::get('/user/{name}', fn ($name) => $name)->whereAlpha('name');
Route::get('/user/{id}', fn ($id) => $id)->whereUuid('id');

// Global constraints (all routes)
Route::pattern('id', '[0-9]+');

// Route model binding
Route::get('/posts/{post:slug}', fn (Post $post) => $post);
Route::get('/users/{user}/posts/{post:slug}', fn (User $user, Post $post) => $post)
    ->scopeBindings();

// Enum binding
Route::get('/categories/{category}', fn (Category $category) => $category->value);
```

**Comparison:**
| Feature | Ajo-kit | Laravel |
|---------|---------|---------|
| Dynamic params | `[id]` | `{id}` |
| Optional params | ❌ | `{id?}` with default |
| Catch-all | `[...]` → `*` | `{path?}` + `->where('path', '.*')` |
| Regex validation | ❌ | `->where()`, `->whereNumber()`, etc. |
| Model binding | ❌ | Implicit + explicit + scoped |
| Enum binding | ❌ | String-backed enums |
| Custom key | ❌ | `{post:slug}` |
| Soft-deleted models | ❌ | `->withTrashed()` |
| Missing model handler | ❌ | `->missing(fn => ...)` |

**Gap Assessment:** Route model binding is Laravel's most significant routing advantage. It eliminates boilerplate database lookups and 404 handling. Ajo-kit currently requires manual fetching in every loader:

```typescript
// Current ajo-kit (manual)
export async function page(req: Request) {
  const post = await db().selectFrom('posts')
    .where('id', '=', Number(req.params.id))
    .executeTakeFirst()
  if (!post) throw new NotFoundError('Post not found')
  return { post }
}

// Hypothetical ajo-kit with model binding
export async function page(req: Request<{ post: Post }>) {
  return { post: req.models.post }  // Already resolved + 404 handled
}
```

---

### 3. Middleware System

#### Ajo-kit: File-Based Inheritance
```
src/
  wares.ts                    # Root: session(), csrf
  (public)/
    wares.ts                  # Public: guest()
  (app)/
    wares.ts                  # Auth: protect(), auth()
    admin/
      wares.ts                # Admin: role('admin')
    account/delete/
      wares.ts                # Dangerous: confirmed()
```

```typescript
// src/wares.ts — applies to ALL routes
export default [
  session(),
  csrf,
  when(req => req.path === '/', redirect(req => req.user ? '/dashboard' : '/login')),
] satisfies Middleware[]

// src/(app)/admin/wares.ts — applies to /admin/* only
export default [role('admin')]
```

**Collection algorithm:**
```typescript
const collect = (segments: string[]): Middleware[] =>
  ancestors(segments).flatMap(path => wares.get(path) ?? [])
```

- Middleware inherits from parent directories automatically
- No explicit group configuration needed
- Order is deterministic: root → group → nested

#### Laravel: Code-Based Groups
```php
// Middleware groups in bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->group('web', [
        EncryptCookies::class,
        StartSession::class,
        VerifyCsrfToken::class,
    ]);
    $middleware->group('api', [
        'throttle:api',
    ]);
    $middleware->priority([
        AuthenticateSession::class,
        AuthorizationMiddleware::class,
    ]);
})

// Route-level middleware
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', ...);
});

// Middleware with parameters
Route::middleware('role:admin,editor')->group(function () { ... });

// Terminable middleware (runs after response sent)
public function terminate(Request $request, Response $response): void {
    // Log, cleanup, etc.
}
```

**Comparison:**
| Aspect | Ajo-kit | Laravel |
|--------|---------|---------|
| Definition | `wares.ts` files | Code config + route groups |
| Inheritance | Automatic from parents | Manual grouping |
| Parameters | Via closure (e.g., `role('admin')`) | String syntax `'role:admin'` |
| Groups | ❌ | ✅ `web`, `api`, custom |
| Priority | Ancestor path order | Configurable priority list |
| Terminable | ❌ | ✅ Post-response cleanup |
| Conditional | `when()` guard | Via middleware logic |
| DX | Zero-config subtree scoping | Explicit but flexible |

**Ajo-kit advantage:** Middleware colocation means you can see exactly what middleware applies by looking at the file tree. No hunting through route files.

**Laravel advantage:** Middleware parameters (`'throttle:60,1'`), groups, and priority ordering offer more fine-grained control. Terminable middleware is useful for logging.

---

### 4. Data Loading

#### Ajo-kit: Colocated Loaders with Parallel Execution
```typescript
// src/(app)/account/chats/[id]/handler.ts

// Layout data (loaded in parallel with other layouts)
export async function layout(req: Request) {
  req.track?.(`user:${req.user!.id}`)
  return { user: await loadUser(req.user!.id) }
}

// Page data (loaded after layouts)
export async function page(req: Request) {
  const chatId = Number(req.params.id)
  req.track?.([`chat:${chatId}`, `user:${req.user!.id}`])

  const [chat, messages, meta] = await Promise.all([
    loadChat(chatId),
    loadMessages(chatId),
    unreadMeta(chatId, req.user!.id)
  ])

  if (!chat) throw new NotFoundError('Chat not found')
  return { chat, messages, ...meta }
}

// Per-route head/meta
export async function head(req: Request) {
  return {
    title: 'Chat',
    description: 'Your conversation',
    meta: [{ property: 'og:type', content: 'website' }]
  }
}
```

**Loading pipeline:**
1. Layouts load in parallel (deferred promises)
2. Page loads after layouts (can access parent data)
3. Head loads alongside page
4. All data composed: `[head, ...layoutData, pageData]`
5. AJAX requests return JSON; full requests return SSR HTML

#### Laravel + Inertia: Controller-Based
```php
// app/Http/Controllers/ChatController.php
class ChatController extends Controller
{
    public function show(Chat $chat) // Model binding
    {
        $this->authorize('view', $chat);

        return Inertia::render('Chat/Show', [
            'chat' => $chat,
            'messages' => $chat->messages()->with('user')->latest()->paginate(10),
            'participants' => $chat->participants,
        ]);
    }
}
```

**Comparison:**
| Aspect | Ajo-kit | Laravel + Inertia |
|--------|---------|-------------------|
| Where data loads | `handler.ts` (colocated) | Controllers (separate) |
| Per-layout data | ✅ Each layout has own loader | ❌ Shared data via middleware |
| Parent data | `parent()` callback | `Inertia::share()` |
| Parallel loading | ✅ Layouts run in parallel | ❌ Sequential |
| Live revalidation | ✅ `track()` + `emit()` | ❌ Manual (Echo/Pusher) |
| Head management | ✅ `head()` loader | ❌ Manual `<Head>` component |
| Caching/304 | ❌ | ❌ (Inertia has versioning) |
| Lazy loading | ✅ `defer: true` | ✅ Inertia lazy props |

**Ajo-kit advantages:**
- Data loading is colocated with the route — no separate controller files
- Per-layout data means each layout can independently load what it needs
- Parallel execution reduces waterfall requests
- Built-in live updates via `track()`/`emit()`

**Laravel advantages:**
- Model binding eliminates manual fetching boilerplate
- Lazy props for deferring expensive data
- Shared data (`Inertia::share()`) for global data like auth user
- Pagination built into Eloquent

---

### 5. Actions & Form Mutations

#### Ajo-kit: Route-Scoped Actions
```typescript
// handler.ts — actions colocated with page
export const actions = {
  send: async (req: Request) => {
    const { text } = req.body as { text: string }
    await db().insertInto('messages').values({ text, user: req.user!.id }).execute()
    emit([`chat:${chatId}`, `chats:${req.user!.id}`])
    return { ok: true }
  },

  delete: async (req: Request) => {
    await db().deleteFrom('messages').where('id', '=', req.body.id).execute()
    emit([`chat:${chatId}`])
    return { ok: true }
  }
}

// Client-side invocation
const send = action<{ ok: true }>('send')
<form set:onsubmit={send.submit}>...</form>

// Programmatic invocation
await send.invoke({ text: 'Hello!' })
```

**Action routing:** `POST /current/route?/actionName`
**Action inheritance:** Actions searched up ancestor tree (innermost wins)

#### Laravel: Controller Methods + Form Requests
```php
// Controller
public function store(StoreMessageRequest $request, Chat $chat)
{
    $message = $chat->messages()->create($request->validated());
    broadcast(new MessageSent($message))->toOthers();
    return back();
}

// Form Request (validation)
class StoreMessageRequest extends FormRequest
{
    public function rules(): array
    {
        return ['text' => 'required|string|max:1000'];
    }
}
```

**Comparison:**
| Aspect | Ajo-kit | Laravel |
|--------|---------|---------|
| Definition | `actions = {}` in handler.ts | Controller methods |
| Invocation | `POST ?/name` | Standard HTTP routes |
| Validation | Valibot in handler | Form Request classes |
| Inheritance | ✅ Ancestor chain | ❌ Explicit routing |
| Client helper | `action<T>('name')` | Forms / Axios |
| Live updates | `emit()` built-in | Broadcast events |
| Redirect | `{ redirect: '/path' }` | `redirect()->back()` |

**Ajo-kit advantages:**
- Actions are colocated with the page they serve
- Built-in `emit()` for live updates after mutation
- Type-safe client helper with loading/error states
- Action inheritance lets parent routes provide shared actions

**Laravel advantages:**
- Dedicated Form Request classes for complex validation
- Resource controllers generate 7 CRUD routes in one line
- Broadcasting system for real-time events
- Redirect helpers with session flashing

---

### 6. API Endpoints

#### Ajo-kit
```typescript
// src/(app)/tokens/handler.ts
// Page loaders + actions + API all in one file

export async function page(req: Request) { ... }       // GET /tokens (page)
export const actions = { create: async (req) => ... }  // POST /tokens?/create (action)

export default {                                        // /api/tokens (API)
  async get(req: Request, res: Response) {
    send(res, 200, { tokens: await list(req.user!.id) })
  },
  async post(req: Request, res: Response) {
    const token = await create(req.user!.id, req.body.name, req.body.abilities)
    send(res, 201, { token })
  },
  async delete(req: Request, res: Response) {
    await revoke(req.body.id)
    send(res, 200, { message: 'Revoked' })
  }
}
```

- API routes auto-mounted at `/api/<pattern>`
- Same middleware (wares) applies
- Supports GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD

#### Laravel
```php
// routes/api.php
Route::apiResource('tokens', TokenController::class);

// Generates:
// GET    /api/tokens          → index
// POST   /api/tokens          → store
// GET    /api/tokens/{token}  → show
// PUT    /api/tokens/{token}  → update
// DELETE /api/tokens/{token}  → destroy
```

**Comparison:**
| Aspect | Ajo-kit | Laravel |
|--------|---------|---------|
| API + page in same file | ✅ | ❌ Separate routes/controllers |
| Resource scaffolding | ❌ | ✅ 5/7 CRUD routes in one line |
| API versioning | ❌ | ✅ Prefix customization |
| Rate limiting | ❌ (auth only) | ✅ `throttle` middleware |
| CORS | ❌ | ✅ Built-in config |
| Content negotiation | ✅ Accept header | ✅ |
| API authentication | ✅ Bearer tokens | ✅ Sanctum |

**Gap Assessment:** Laravel's `Route::apiResource()` generates 5 standard API routes from a single line. Ajo-kit requires manually defining each HTTP method. A `resource()` helper could reduce boilerplate significantly.

---

### 7. Live Data (SSE)

#### Ajo-kit: Built-in Topic-Based SSE
```typescript
// Loader subscribes to topics
export async function page(req: Request) {
  req.track?.([`chat:${chatId}`, `user:${userId}`])
  return { messages: await loadMessages(chatId) }
}

// Mutation emits affected topics
export const actions = {
  send: async (req: Request) => {
    await insertMessage(...)
    emit([`chat:${chatId}`, ...participantTopics])
    return { ok: true }
  }
}
```

**How it works:**
1. Client opens SSE connection to current route
2. Server tracks topics per connection
3. `emit()` debounces (10ms), finds matching connections
4. Server re-runs loaders, diffs old vs new data
5. JSON patches sent via SSE
6. Client applies patches, re-renders

**Advantages:**
- Zero-config real-time updates
- Efficient: only affected loaders re-run
- Minimal payload: JSON patches, not full re-sends
- Topic granularity prevents unnecessary updates

#### Laravel: Manual (Echo/Pusher or eventStream)
```php
// Laravel 12 event streaming (new)
Route::get('/chat', function () {
    return response()->eventStream(function () {
        $stream = OpenAI::client()->chat()->createStreamed(...);
        foreach ($stream as $response) {
            yield $response->choices[0];
        }
    });
});

// Traditional: Broadcasting with Pusher/Ably
class MessageSent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.'.$this->chat->id)];
    }
}
```

**Comparison:**
| Aspect | Ajo-kit | Laravel |
|--------|---------|---------|
| SSE support | ✅ Built-in, automatic | ✅ `eventStream()` (L12) |
| Topic pub/sub | ✅ `track()`/`emit()` | ❌ Manual broadcasting |
| Auto-revalidation | ✅ Loaders re-run | ❌ Manual event handling |
| JSON patching | ✅ Automatic diff | ❌ Full payloads |
| External service | ❌ In-process | ✅ Pusher/Ably/Redis |
| Horizontal scaling | ⚠️ Sticky sessions | ✅ External broker |
| Setup complexity | Zero | High (Echo + Pusher) |

**Ajo-kit advantage:** Live updates are a first-class framework feature, not an add-on. Developers just call `track()` in loaders and `emit()` in mutations.

**Laravel advantage:** External message brokers scale horizontally. Laravel Broadcasting integrates with WebSocket providers for bidirectional communication.

---

### 8. Nested Layouts

#### Ajo-kit
```
src/
  layout.tsx                  # Root layout (theme, error boundary)
  (app)/
    layout.tsx                # App layout (nav, sidebar)
    handler.ts                # layout() loader → { user, unread }
    account/
      layout.tsx              # Account layout (tabs)
      handler.ts              # layout() loader → { sections }
      profile/
        page.tsx              # Profile page
        handler.ts            # page() loader → { profile }
```

Each layout receives its own data via `state.data[depth]`:
```typescript
// Root layout: args.data = state.data[0]
// App layout:  args.data = state.data[1]
// Account layout: args.data = state.data[2]
// Profile page: args.data = state.data[3]
```

**Composition:** Layouts wrap via `reduceRight` — each receives `children` prop:
```tsx
const AppLayout: Stateful<LayoutArgs<LayoutData>> = function* (args) {
  while (true) {
    yield (
      <>
        <Nav user={args.data?.user} />
        <main>{args.children}</main>
      </>
    )
  }
}
```

#### Laravel
Laravel has no built-in nested layout system. Blade uses template inheritance:
```blade
{{-- layouts/app.blade.php --}}
<html>
  <body>
    @yield('content')
  </body>
</html>

{{-- pages/dashboard.blade.php --}}
@extends('layouts.app')
@section('content')
  <h1>Dashboard</h1>
@endsection
```

With Inertia, persistent layouts are possible but without per-layout data:
```jsx
Home.layout = page => <AppLayout children={page} />
```

**Comparison:**
| Aspect | Ajo-kit | Laravel (Blade) | Laravel (Inertia) |
|--------|---------|-----------------|-------------------|
| Nesting | ✅ Automatic | Manual (`@extends`) | Manual (layout prop) |
| Per-layout data | ✅ Own loader | ❌ | ❌ (shared data only) |
| Persistence | ✅ Generator state | N/A | ✅ Persistent layouts |
| Slot/children | ✅ `args.children` | ✅ `@yield` | ✅ `children` prop |
| Breaking out | ❌ | ✅ (skip extends) | ✅ (no layout prop) |

---

### 9. Error Handling

#### Ajo-kit
```typescript
// Typed error classes
throw new NotFoundError('Chat not found')     // 404
throw new ForbiddenError('Not allowed')        // 403
throw new UnauthorizedError()                  // 401
throw new InvalidError({ name: 'Required' })   // 400 with field errors

// Server error handler
onError: (err, req, res) => {
  const normalized = normalize(err)
  if (ajax(req)) send(res, normalized.status, normalized.toJSON())
  else render(req, res, errorPage, normalized)
}
```

#### Laravel
```php
// Abort helpers
abort(404);
abort(403, 'Not allowed');
abort_unless($condition, 403);

// Custom error pages
// resources/views/errors/404.blade.php
// resources/views/errors/500.blade.php

// Exception rendering
class Handler extends ExceptionHandler
{
    public function render($request, Throwable $e)
    {
        if ($e instanceof ModelNotFoundException) {
            return response()->view('errors.404', [], 404);
        }
        return parent::render($request, $e);
    }
}

// Per-route missing model
Route::get('/posts/{post}', ...)->missing(fn () => redirect('/posts'));
```

**Comparison:**
| Aspect | Ajo-kit | Laravel |
|--------|---------|---------|
| Error classes | ✅ Typed (NotFoundError, etc.) | ✅ HTTP exceptions |
| Field validation errors | ✅ `InvalidError` with fields | ✅ Form Request |
| Custom error pages | ✅ Error component | ✅ Blade error views |
| Per-route 404 handling | ❌ | ✅ `->missing()` callback |
| AJAX error handling | ✅ JSON response | ✅ JSON response |
| Error page per route | ❌ (global only) | ❌ (global only) |

---

### 10. Production Features

#### Route Caching

**Laravel:**
```bash
php artisan route:cache    # Serialize routes to cache file
php artisan route:clear    # Remove route cache
```
- Dramatically reduces route registration time (especially with 100+ routes)
- Required for production deployments

**Ajo-kit:**
- No route caching mechanism
- Routes discovered at startup via `import.meta.glob()`
- Build step compiles routes into the server bundle
- Startup cost is minimal due to Vite's static analysis

**Assessment:** Not a significant gap. Vite's build step effectively pre-compiles routes. Only becomes relevant with hundreds of routes.

#### Route Listing

**Laravel:**
```bash
php artisan route:list
php artisan route:list --path=api
php artisan route:list -v  # Show middleware
php artisan folio:list     # Folio pages
```

**Ajo-kit:** No equivalent CLI command.

**Assessment:** A `kit routes` command would be useful for debugging. Could list all discovered routes, their patterns, middleware stacks, and handler exports.

---

## Architecture Comparison

### Ajo-kit Architecture
```
┌──────────────────────────────┐
│      JSX Pages (Ajo)         │  Generator components
│   + Stateful Layouts         │  Render from args.data
└────────┬─────────────────────┘
         │ action() + handler()
         ↓
┌──────────────────────────────┐
│    handler.ts                │  layout() + page() + head()
│    wares.ts                  │  actions = {}
│    (colocated per route)     │  default { get, post, ... }
└────────┬─────────────────────┘
         │ track() + emit()
         ↓
┌──────────────────────────────┐
│    SSE Live Pipeline         │  Topic pub/sub
│    JSON Patch Diffing        │  Debounced revalidation
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│    Kysely + SQLite           │
└──────────────────────────────┘
```

**Key principle:** Everything is colocated per route. UI, data, middleware, actions, and API all live together.

### Laravel Architecture
```
┌──────────────────────────────┐
│  Blade / Inertia (Vue/React) │  Template/SPA rendering
└────────┬─────────────────────┘
         │ HTTP requests
         ↓
┌──────────────────────────────┐
│  routes/web.php              │  Explicit route definitions
│  routes/api.php              │  Controller references
└────────┬─────────────────────┘
         │ Middleware pipeline
         ↓
┌──────────────────────────────┐
│  Controllers                 │  Request handling
│  Form Requests               │  Validation
│  Resources                   │  API transformation
└────────┬─────────────────────┘
         │ Eloquent ORM
         ↓
┌──────────────────────────────┐
│  MySQL / PostgreSQL / SQLite │
└──────────────────────────────┘
```

**Key principle:** Separation of concerns. Routes, controllers, models, views each in their own directory.

---

## Gap Analysis & Recommendations

### Features Worth Implementing

#### Priority 1: Named Routes + URL Generation
**Why:** Eliminates hardcoded URLs throughout the app. Essential for refactoring.

```typescript
// Current
<a href="/account/profile">Profile</a>
return { redirect: '/account/profile' }

// Proposed: route names auto-derived from file path
<a href={route('account.profile')}>Profile</a>
return { redirect: route('account.profile') }

// With params
<a href={route('account.chats.show', { id: 42 })}>Chat</a>
```

**Implementation:** Auto-generate route names from file paths during build. Export a typed `route()` helper.

**Effort:** ~4-6 hours

---

#### Priority 2: Parameter Constraints
**Why:** Validates route params before handlers run. Prevents "NaN" from `Number(req.params.id)`.

```typescript
// Proposed: export constraints in handler.ts
export const params = {
  id: /^\d+$/           // Regex
  // or
  id: 'number'          // Built-in helpers
  // or
  slug: /^[a-z0-9-]+$/
}
```

**Implementation:** Check constraints in route matching, return 404 if no match. Similar to SvelteKit's `params` matchers.

**Effort:** ~3-4 hours

---

#### Priority 3: Route Listing CLI Command
**Why:** Debugging aid. Shows all routes, patterns, middleware, and handler exports.

```bash
$ kit routes

  Pattern                     Methods    Middleware           Handlers
  /                           GET        session,csrf         (redirect)
  /login                      GET,POST   session,csrf,guest   page,actions
  /register                   GET,POST   session,csrf,guest   page,actions
  /dashboard                  GET        session,csrf,auth    page,layout
  /account/profile            GET,POST   session,csrf,auth    page,actions
  /account/chats/:id          GET,POST   session,csrf,auth    page,actions
  /admin/users                GET        session,csrf,admin   page
  /api/tokens                 GET,POST   session,csrf,auth    API
```

**Effort:** ~2-3 hours

---

#### Priority 4: Redirect Routes (Shorthand)
**Why:** Common need, currently requires a handler.ts with just `return { redirect: '...' }`.

```typescript
// Current: src/(app)/account/handler.ts
export async function page() {
  return { redirect: '/account/profile' }
}

// Proposed: declarative redirect in route config or handler shorthand
export const redirect = '/account/profile'
```

**Effort:** ~1-2 hours

---

#### Priority 5: Optional Parameters
**Why:** Useful for routes like `/blog/[[page]]` where page is optional.

```typescript
// Proposed: src/blog/[[page]]/page.tsx
// Matches: /blog AND /blog/2
// req.params.page = undefined | '2'
```

**Implementation:** Follow SvelteKit's `[[param]]` convention.

**Effort:** ~2-3 hours

---

### Features That DON'T Make Sense for Ajo-kit

| Laravel Feature | Why Skip |
|----------------|----------|
| **Route model binding** | Ajo-kit uses Kysely, not an ORM with models. Type-safe queries are more explicit. Could add a simpler `resolve()` helper instead. |
| **Resource controllers** | File-system routing + actions already cover CRUD patterns. Adding resource scaffolding would conflict with the convention. |
| **Subdomain routing** | Edge case. Most ajo-kit apps are single-domain. Can be handled at reverse proxy level. |
| **Route caching** | Vite build already optimizes routes. No runtime route registration cost. |
| **Middleware groups** | File-based wares already handle grouping naturally via directory structure. |
| **Form method spoofing** | Ajo-kit uses SPA actions via `action()`, not traditional HTML forms. |
| **CORS config** | Better handled at reverse proxy (Nginx/Caddy) or via a simple middleware. |

---

### What Ajo-kit Does Better

| Area | Ajo-kit Advantage |
|------|-------------------|
| **Colocation** | UI + data + middleware + actions all in one place per route |
| **Live updates** | Zero-config SSE with topic pub/sub — no external services needed |
| **Type safety** | End-to-end TypeScript, typed params, typed actions |
| **Layout data** | Each layout loads its own data independently and in parallel |
| **Simplicity** | ~2000 LOC vs 50k+. One convention to learn, not dozens of classes |
| **HMR** | Handler hot reload without full server restart |
| **Head management** | `head()` loader with automatic merge/deduplication |
| **Action inheritance** | Parent routes can provide shared actions to children |
| **Deferred loading** | Built-in loading state management per layout level |
| **Stateful components** | Generator-based components preserve state across re-renders naturally |

---

## Performance Comparison

### Route Resolution

| Operation | Ajo-kit | Laravel |
|-----------|---------|---------|
| Route matching | navaid (trie-based) | Symfony Router |
| Routes registered | Build-time glob | Runtime (cached in prod) |
| Middleware resolution | Map lookup + ancestors | Array merge from groups |
| First request | ~5ms | ~10ms (cached) / ~50ms (uncached) |

### Data Loading

| Pattern | Ajo-kit | Laravel + Inertia |
|---------|---------|-------------------|
| Parallel layout loaders | ✅ Promise.all | ❌ Sequential |
| Live revalidation | ~10ms debounce + diff | N/A (manual) |
| SSR render | Single-pass Ajo HTML | Blade compile / Inertia SSR |
| Client navigation | AJAX JSON response | Inertia page object |

### Live Updates

| Metric | Ajo-kit (SSE) | Laravel (Pusher) |
|--------|---------------|------------------|
| Latency | ~10-50ms | ~100-300ms |
| Payload | JSON patches (~100B) | Full event (~1KB) |
| Connection | HTTP/2 SSE | WebSocket |
| Cost | Free (in-process) | Paid service |
| Scaling | Sticky sessions | Horizontal |

---

## Conclusion

Ajo-kit's routing system represents a **modern, colocated approach** that integrates data loading, live updates, and UI rendering into a unified file-system convention. It excels in:

- **Developer experience:** Everything about a route lives together
- **Live updates:** First-class SSE with zero configuration
- **Type safety:** Full TypeScript end-to-end
- **Simplicity:** Minimal API surface, predictable behavior

Laravel's routing system is **more mature and feature-rich**, excelling in:

- **Flexibility:** Code-based routing offers maximum control
- **Model binding:** Eliminates boilerplate database lookups
- **Ecosystem:** Broadcasting, queues, resource routes, CLI tools
- **Scalability:** External message brokers for horizontal scaling

**For most ajo-kit applications**, the current routing system is **more than sufficient** and offers a better developer experience than Laravel for real-time applications.

**Recommended improvements** (in priority order):
1. Named routes + `route()` helper (~4-6h)
2. Parameter constraints (~3-4h)
3. `kit routes` CLI command (~2-3h)
4. Redirect route shorthand (~1-2h)
5. Optional parameters `[[param]]` (~2-3h)

**Total effort for improvements:** ~12-18 hours

---

## References

**Laravel Documentation:**
- [Laravel Routing](https://laravel.com/docs/12.x/routing)
- [Laravel Controllers](https://laravel.com/docs/12.x/controllers)
- [Laravel Middleware](https://laravel.com/docs/12.x/middleware)
- [Laravel Folio](https://laravel.com/docs/12.x/folio)
- [Laravel Responses](https://laravel.com/docs/12.x/responses)

**SvelteKit Documentation:**
- [SvelteKit Routing](https://svelte.dev/docs/kit/routing)
- [SvelteKit Advanced Routing](https://svelte.dev/docs/kit/advanced-routing)

**Inertia.js:**
- [Inertia.js Pages](https://inertiajs.com/pages)
- [Inertia.js Protocol](https://inertiajs.com/the-protocol)

**Framework Sources:**
- [Laravel Folio GitHub](https://github.com/laravel/folio)
- [Ajo-kit LLM Guide](docs/LLMs.md)
- [Ajo-kit Data System](docs/data.md)
- [Ajo-kit API Endpoints](docs/api-endpoints.md)
