# Events: Real-time Server → Client

Contraparte de **Actions** (cliente → servidor). Los eventos fluyen del servidor al cliente via SSE.

## Simetría con Actions

| Aspecto | Actions | Events |
|---------|---------|--------|
| Dirección | Cliente → Server | Server → Cliente |
| Transporte | HTTP POST | SSE |
| Definición | `export const actions = {}` | `export const events = {}` |
| Invocación server | - | `emit(name, params?)` |
| Helper cliente | `action(name)` | `subscribe(name, callback)` |
| Estado | `ActionState<T>` | `EventState<T>` |

## Arquitectura

SSE usa la misma URL que la página. El server detecta `Accept: text/event-stream` y responde con SSE en lugar de HTML.

```
Browser: GET /account/chats/5
         Accept: text/html
              │
              ▼
         ┌─────────┐
         │  wares  │  session, auth, participant check
         └─────────┘
              │
              ▼
         ┌─────────┐
         │  page   │  render HTML + initial data
         └─────────┘

EventSource: GET /account/chats/5
             Accept: text/event-stream
              │
              ▼
         ┌─────────┐
         │  wares  │  mismos wares protegen SSE
         └─────────┘
              │
              ▼
         ┌─────────┐
         │   sse   │  establish SSE + send initial event data
         └─────────┘
```

## Server Side

### Event Bus

Bus global en memoria. `on()` registra listeners, `emit()` los ejecuta.

```ts
// server.tsx
type Listener = (params: Record<string, unknown>) => void
const bus = new Map<string, Set<Listener>>()

export const on = (name: string, fn: Listener) => {
  if (!bus.has(name)) bus.set(name, new Set())
  bus.get(name)!.add(fn)
  return () => bus.get(name)!.delete(fn)
}

export const emit = (name: string, params?: Record<string, unknown>) => {
  bus.get(name)?.forEach(fn => fn(params ?? {}))
}
```

### handler.ts — Definir eventos

```ts
// src/(app)/account/chats/[id]/handler.ts
import { emit } from '/src/server'

export const deps = ['messages', 'participants', ':user']

export async function page(req: Request) {
  const chatId = Number(req.params.id)
  return { messages: await db().selectFrom('messages').where('chat', '=', chatId).execute() }
}

// Eventos — retornan data que se envía al cliente
export const events = {
  messages: async (req: Request) => {
    const chatId = Number(req.params.id)
    return { messages: await db().selectFrom('messages').where('chat', '=', chatId).execute() }
  }
}

// Actions pueden emitir eventos manualmente (para filtrado por params)
export const actions = {
  send: async (req: Request) => {
    await db().insertInto('messages').values({ ... }).execute()
    emit('messages', { id: String(req.params.id) })  // solo clientes viendo este chat
    return { ok: true }
  }
}
```

### Auto-emit

El mecanismo por defecto. Cuando un handler exporta `deps` y `events`, las escrituras a las tablas en `deps` disparan automáticamente los eventos.

**Cómo funciona:**

1. `TrackerPlugin` (Kysely plugin en `db.ts`) intercepta INSERT/UPDATE/DELETE
2. Llama a `bump(table)` que incrementa la versión de la tabla
3. `bump()` llama al `hook` registrado por `tap()`
4. `tap()` busca qué eventos dependen de esa tabla via `binds` (mapa tabla → eventos)
5. Los eventos se acumulan en un `Set<string>` (`pending`)
6. Se disparan vía `queueMicrotask` → un solo `emit()` por nombre, debounced

```ts
// server.tsx — auto-emit setup
const binds = new Map<string, Set<string>>()

for (const [, handler] of handlers) if (handler.events && handler.deps) {
  const tables = handler.deps.filter(d => !d.startsWith(':'))
  for (const table of tables) {
    if (!binds.has(table)) binds.set(table, new Set())
    for (const name of Object.keys(handler.events)) binds.get(table)!.add(name)
  }
}

const pending = new Set<string>()

tap(table => {
  const names = binds.get(table)
  if (!names) return
  if (!pending.size) queueMicrotask(() => {
    pending.forEach(name => emit(name))
    pending.clear()
  })
  names.forEach(name => pending.add(name))
})
```

**Ejemplo concreto:**

```ts
// (app)/handler.ts
export const deps = ['users', 'members', 'messages', 'participants', ':user']
export const events = { status: async (req) => { ... } }
```

Cualquier acción que escriba a `users`, `members`, `messages` o `participants` dispara `emit('status')` automáticamente. No se necesita `emit()` manual.

**Requisitos:**
1. Handler exporta `deps` con nombres de tablas
2. Handler exporta `events` con handlers
3. Eso es todo — cualquier acción que escriba a esas tablas dispara los eventos

### Manual emit (solo para filtrado por params)

Auto-emit no puede saber parámetros de ruta. Usar `emit(name, params)` manualmente solo cuando se necesita filtrar:

```ts
emit('messages', { id: '5' })  // solo clientes viendo chat 5
```

Sin params, auto-emit maneja todo.

### Event Registration & Dispatch

Cuando se carga un handler con `events`, se registra un listener en el bus y se almacena en `registrations` (para SSE-on-connect y cache):

```ts
type EventRegistration = {
  route: { pattern: RegExp, keys: string[] }
  name: string
  handler: EventHandler
  deps?: string[]
  key: string        // handler path (e.g. "(app)")
  cacheKey: string   // navigation cache key (e.g. "(app)" para layouts, "page:path" para pages)
}
```

**`cacheKey`** se determina por el tipo de handler:
- Si el handler exporta `layout()` → `cacheKey = key` (e.g. `"(app)"`)
- Si solo exporta `page()` → `cacheKey = "page:" + key` (e.g. `"page:(app)/dashboard"`)

Esto permite que los mensajes SSE actualicen el cache de navegación del cliente (ver [Cache de Navegación via SSE](#cache-de-navegación-via-sse)).

### Layout-level Events (Trailing Group Detection)

Los eventos en layout handlers (donde el último segmento es un grupo) matchean **todos los subpaths**, no solo la ruta exacta.

| Handler | Último segmento | Event pattern | Matchea |
|---------|----------------|---------------|---------|
| `(app)/handler.ts` | `(app)` → grupo | `/*` | Todo |
| `account/(settings)/handler.ts` | `(settings)` → grupo | `/account/*` | Todo bajo `/account` |
| `account/chats/handler.ts` | `chats` → no grupo | `/account/chats` | Solo exacto |
| `account/chats/[id]/handler.ts` | `[id]` → no grupo | `/account/chats/:id` | Solo con `:id` |

### emit() con Parámetros (Filtrado)

`emit()` acepta params opcionales que filtran qué clientes reciben el evento:

```ts
emit('messages', { id: '5' })  // Solo clientes donde route extrae id='5'
emit('status')                  // Todos los clientes que matchean la ruta del evento
```

Los params se comparan contra los parámetros extraídos de la ruta del cliente:

```ts
const skip = Object.entries(params).some(
  ([k, v]) => extracted[k] !== undefined && extracted[k] !== v
)
```

## Client Side

### Types

```ts
// constants.ts
export type EventState<T = Entry> = { data: T | null; error: Entry | null }
export type EventCallback<T = Entry> = (state: EventState<T>) => void
```

### SSE Connection

El componente `App` en `app.tsx` gestiona la conexión SSE. Se conecta después de cada navegación, solo si la página registró subscribers.

```ts
// app.tsx
const connect = (path: string) => {
  sse.source?.close()

  // Enviar seals para skip de on-connect
  const have = [...seals].map(([k, v]) => `${k}:${v}`).join(',')
  sse.source = new EventSource(have ? `${path}?es=${have}` : path)

  sse.source.onopen = () => { sse.retries = 0 }

  sse.source.onmessage = (e) => {
    const { event, data, error, sum, nav } = JSON.parse(e.data)
    if (sum) seals.set(event, sum)                              // Actualizar seal
    if (nav && data) cache.set(nav.key, { value: data, sum: nav.sum })  // Actualizar nav cache
    subscribers.get(event)?.forEach(fn => fn({ data, error }))  // Notificar subscribers
  }

  sse.source.onerror = () => {
    sse.source?.close()
    // Exponential backoff with jitter: 1s, 2s, 4s, 8s... max 30s
    const base = Math.min(1000 * 2 ** sse.retries, 30_000)
    const jitter = base * Math.random()
    sse.retries++
    setTimeout(() => connect(path), base + jitter)
  }
}
```

### Helper subscribe()

```ts
// client.tsx
export function subscribe<T = Entry>(name: string, callback: EventCallback<T>) {
  const component = current()

  const wrapped = (state: EventState) => {
    callback(state as EventState<T>)
    component.next()  // Re-render el componente
  }

  if (!subscribers.has(name)) subscribers.set(name, new Set())
  subscribers.get(name)!.add(wrapped)
}
```

### Uso en page.tsx

```tsx
const ChatRoom: Stateful<PageArgs<Data>> = function* (args) {
  let messages = args.data?.messages ?? []

  subscribe<{ messages: Message[] }>('messages', ({ data, error }) => {
    if (error) return
    messages = data!.messages
  })

  while (true) {
    yield <ul>{messages.map(m => <li key={m.id}>{m.text}</li>)}</ul>
  }
}
```

### Pitfall: No sobrescribir estado reactivo con args.data

```tsx
// MAL — args.data sobrescribe el estado SSE en cada re-render
while (true) {
  if (args.data?.items) items = args.data.items  // sobrescribe update SSE
  yield ...
}

// BIEN — inicializar antes del loop, subscribe() maneja updates
let items = args.data?.items ?? []
subscribe('items', ({ data }) => { items = data!.items })
while (true) { yield ... }
```

## Cache & Skip System

El sistema de eventos integra tres mecanismos de cache para minimizar network y CPU:

### 1. Seals: Event sums para SSE-on-connect skip

**Problema:** Cada vez que SSE conecta (navegación, reconnect), el server ejecuta TODOS los event handlers matching y envía data. Si el cliente ya tiene esa data (del fetch de navegación o de un SSE previo), es redundante.

**Solución:** Seals — un `Map<string, string>` en el cliente que mapea nombre de evento → sum.

**Flujo:**

```
SSR /dashboard
  → Server computa event sums via seal() → { status: 'abc' }
  → __SSR__ incluye es: { status: 'abc' }
  → Client hydrate: seals.set('status', 'abc')

SSE connect /dashboard?es=status:abc
  → Server computa depSum('status') → 'abc'
  → Match → SKIP (0 queries, 0 bytes)

Tabla cambia → auto-emit 'status'
  → Broadcast: { event: 'status', data: {...}, sum: 'def' }
  → Client: seals.set('status', 'def')

SSE reconnect /dashboard?es=status:def
  → Match → SKIP ✓
```

**Server side — `seal()`:**

```ts
// server.tsx — computa sums de eventos para una ruta
const seal = (path: string, userId?: number) => {
  const es: Record<string, string> = {}
  for (const reg of registrations) {
    if (!reg.route.pattern.exec(path)) continue
    const s = depSum(reg.deps, userId, reg.key)
    if (s) es[reg.name] = s
  }
  return es
}
```

`seal()` se usa en:
- **SSR**: `__SSR__` incluye `es: seal(path, userId)` para hidratar seals
- **Ajax**: response incluye `es: seal(path, userId)` (o `null` si no cambió)

**Client side — seals map:**

```ts
// app.tsx
export const seals = new Map<string, string>()
```

Se popula desde:
1. **SSR hydration** (`client.tsx`): `if (data.es) for (const [name, s] of Object.entries(data.es)) seals.set(name, s)`
2. **Ajax fetch** (`app.tsx resolve()`): `if (es) for (const [name, s] of Object.entries(es)) seals.set(name, s)`
3. **SSE messages** (`app.tsx onmessage`): `if (sum) seals.set(event, sum)`

Los seals **persisten entre navegaciones** — no se limpian al cambiar de página. Esto permite skip incluso al volver a una página visitada.

### 2. depSum: Shared sum function para navegación y eventos

`depSum()` es la función central que genera sums basados en deps. Acepta un `key` opcional que distingue sums de navegación vs eventos:

```ts
const depSum = (deps: string[] | undefined, userId?: number, key?: string) => {
  if (!deps) return null
  const { tables, user, ttl } = parseDeps(deps)
  if (tables.length === 0) return null
  return sum({
    v: snapshot(tables),    // versiones actuales de las tablas
    u: user ? userId : undefined,
    t: ttl ? Math.floor(Date.now() / ttl) : undefined,
    k: key                  // undefined para navegación, handler key para eventos
  })
}
```

- **Navegación:** `depSum(deps, userId)` — sin key
- **Eventos:** `depSum(deps, userId, handlerKey)` — con key para diferenciar

El `key` distingue handlers que comparten las mismas tablas pero pertenecen a rutas diferentes (e.g., `(app)/handler.ts` vs `(app)/admin/handler.ts`).

### 3. Cache de navegación via SSE

**Problema:** SSE entrega data fresca cuando cambian las tablas, pero el navigation cache del cliente mantiene sums stale. Al re-navegar, el server ve mismatch y re-envía todo.

**Solución:** Cada mensaje SSE incluye `nav: { key, sum }` — la cache key y sum de navegación correspondiente. El cliente actualiza su navigation cache.

**Server — broadcast incluye nav:**

```ts
const data = await fn(req)
const s = depSum(handlerDeps, client.req.user?.id, key)       // event sum (con key)
const nav = depSum(handlerDeps, client.req.user?.id)           // nav sum (sin key)
client.send({
  event: name,
  data,
  error: null,
  sum: s,
  nav: nav ? { key: cacheKey, sum: nav } : undefined
})
```

**Client — onmessage actualiza cache:**

```ts
const { event, data, error, sum, nav } = JSON.parse(e.data)
if (sum) seals.set(event, sum)
if (nav && data) cache.set(nav.key, { value: data, sum: nav.sum })
```

**Resultado:** Al re-navegar, el `X-Have` header envía el sum actualizado → server ve match → skip handler → `null` response → client usa cache.

### 4. es null optimization en ajax

Cuando todos los event sums del path actual ya están en el `X-Have` del cliente, el server envía `es: null` en lugar del objeto. Igual que `data: null` para handlers con sums que matchean.

```ts
// server.tsx — render()
const es = seal(req.path, req.user?.id)
const clientHave = have(req.headers['x-have'] as string | undefined)
const esMatch = es && Object.keys(es).length > 0
  && Object.entries(es).every(([name, s]) => clientHave[`es:${name}`] === s)

// Si match → es: null (client ya tiene los seals correctos)
pack({ data: req.data, sums: req.sums, es: esMatch ? null : es })
```

El cliente envía seals como `es:name=sum` entries en el `X-Have` header:

```ts
// app.tsx — resolve()
const have = [
  ...keys.map(key => ...).map(([key, entry]) => `${key}=${entry.sum}`),
  ...[...seals].map(([name, s]) => `es:${name}=${s}`)
].join(',')
```

## SSE Message Format

Cada mensaje SSE es un JSON con esta estructura:

```ts
{
  event: string            // nombre del evento
  data: Entry | null       // data del handler (null en error)
  error: Entry | null      // error serializado (null en éxito)
  sum?: string             // event seal (depSum con key)
  nav?: {                  // navigation cache info
    key: string            //   cache key (e.g. "(app)" o "page:(app)/dashboard")
    sum: string            //   navigation sum (depSum sin key)
  }
}
```

## SSE-on-Connect (Initial Data)

Cuando un cliente establece la conexión SSE, el server ejecuta todos los event handlers que matchean la ruta del cliente y envía los resultados. Pero primero compara seals — si el cliente ya tiene data fresca, se skipea.

```ts
// server.tsx — sse middleware (on-connect)
const url = new URL(req.originalUrl, `http://${req.headers.host}`)
const held = Object.fromEntries(
  (url.searchParams.get('es') ?? '').split(',').filter(Boolean).map(p => {
    const i = p.indexOf(':')
    return [p.slice(0, i), p.slice(i + 1)]
  })
)

for (const reg of registrations) {
  const match = reg.route.pattern.exec(client.req.path)
  if (!match) continue

  const s = depSum(reg.deps, req.user?.id, reg.key)

  // Skip si el cliente ya tiene este sum
  if (s && held[reg.name] === s) continue

  // Ejecutar handler y enviar
  const nav = depSum(reg.deps, req.user?.id)
  reg.handler(req).then(data => client.send({
    event: reg.name, data, error: null, sum: s,
    nav: nav ? { key: reg.cacheKey, sum: nav } : undefined
  }))
}
```

**Race condition resuelta por SSE-on-connect:**

```
1. Browser navega a /account/chats/5
2. page() se ejecuta (marca chat como seen, retorna messages)
3. HTML se renderiza con unread=1 del layout (calculado antes de page())
4. SSE se conecta a /account/chats/5
5. SSE-on-connect ejecuta events.status → retorna { unread: 0 } (ya seen)
6. Badge se actualiza a 0
```

## Flujo Completo

### A. Primera carga (SSR)

```
1. GET /dashboard (Accept: text/html)
   └─ wares run (session, auth)
   └─ data() middleware:
      └─ Ejecuta layout handlers + page handlers
      └─ Genera sums (deps-based o content-based)
   └─ render():
      └─ Computa seal(path, userId) → { status: 'abc' }
      └─ __SSR__ = pack({ ...state, keys, sums, es: { status: 'abc' } })
      └─ HTML response

2. Client hydrate (client.tsx):
   └─ Unpack __SSR__
   └─ ssr.set(url, data)                    // para skip de loading phase
   └─ cache.set(key, { value, sum })        // popular navigation cache
   └─ seals.set('status', 'abc')            // popular event seals

3. App mounts, router.listen()
   └─ go(page) ejecuta resolve()
   └─ resolve() encuentra SSR cache → skip loading + fetch
   └─ Page registra subscribe('status', cb)
   └─ subscribers.size > 0 → connect(path)

4. SSE connect /dashboard?es=status:abc
   └─ wares run (re-autenticar)
   └─ Server computa depSum('status') → 'abc'
   └─ Match con held['status'] → SKIP
   └─ 0 queries, 0 bytes ✓
```

### B. Navegación client-side (CSR)

```
1. Click en link → router.go('/admin/tokens')
   └─ Disconnect SSE, clear subscribers

2. resolve() fetches:
   └─ X-Have: head=x,(app)=y,page:(app)/admin/tokens=z,es:status=abc
   └─ Server compara sums:
      └─ head: match → null
      └─ (app): match → null (layout data unchanged)
      └─ page: miss → send data
      └─ es: status match → es: null
   └─ Response: { data: [null, null, {...}], sums: [null, null, 'w'], es: null }

3. Client merges:
   └─ null items → cache.get(key).value
   └─ Non-null items → update cache
   └─ es: null → seals unchanged

4. Page mounts, registra subscribers
   └─ connect('/admin/tokens?es=status:abc')
   └─ On-connect: skip si sum match
```

### C. Tabla cambia → auto-emit → broadcast

```
1. Action inserta session (POST /admin/tokens?/create)
   └─ db().insertInto('sessions').values({...}).execute()
   └─ TrackerPlugin.transformQuery → bump('sessions')
   └─ tap callback: binds.get('sessions') → Set{'status', 'activity'}
   └─ pending.add('status'), pending.add('activity')
   └─ queueMicrotask: emit('status'), emit('activity')

2. emit('status') → bus listeners:
   └─ For each SSE client matching route pattern:
      └─ Execute status handler → { user, unread }
      └─ depSum(deps, userId, key) → event sum 'def'
      └─ depSum(deps, userId) → nav sum 'ghi'
      └─ Send: { event: 'status', data: {...}, sum: 'def', nav: { key: '(app)', sum: 'ghi' } }

3. Client receives:
   └─ seals.set('status', 'def')              // nuevo event seal
   └─ cache.set('(app)', { value: data, sum: 'ghi' })  // actualizar nav cache
   └─ subscribers.get('status').forEach(fn => fn({ data, error }))
   └─ component.next() → re-render

4. Re-navegación a /dashboard:
   └─ X-Have incluye (app)=ghi (actualizado por SSE)
   └─ Server: depSum(deps, userId) → 'ghi' → match → skip
   └─ 0 bytes para layout data ✓
```

### D. SSE reconnect

```
1. Conexión se pierde (network, server restart)
   └─ onerror fires
   └─ Exponential backoff: 1s, 2s, 4s... max 30s + jitter

2. Reconnect: GET /dashboard?es=status:def
   └─ Server computa depSum → 'def' → match → skip
   └─ Si tabla cambió mientras desconectado: sum mismatch → send fresh data
```

## Seguridad

### Autorización automática

Los wares de la ruta protegen tanto página como SSE:

- User no participante → wares.ts throw ForbiddenError
- No puede ver página NI conectar SSE
- Un solo lugar para la lógica de autorización (DRY)

### Connection Limits

Máximo 5 conexiones SSE por usuario para prevenir DoS:

```ts
const SSE_MAX_PER_USER = 5

if (req.user) {
  const count = [...clients].filter(c => c.req.user?.id === req.user!.id).length
  if (count >= SSE_MAX_PER_USER) {
    res.writeHead(429)
    res.end()
    return
  }
}
```

### Heartbeat

Heartbeat cada 30s para detectar conexiones zombie:

```ts
const heartbeat = setInterval(() => {
  if (!res.write(':heartbeat\n\n')) {
    clearInterval(heartbeat)
    clients.delete(client)
  }
}, SSE_HEARTBEAT_MS)
```

### Exponential Backoff

El cliente usa backoff exponencial con jitter para reconexiones:

```ts
const base = Math.min(1000 * 2 ** sse.retries, 30_000)
const jitter = base * Math.random()
setTimeout(() => connect(path), base + jitter)
```

Previene thundering herd (jitter distribuye reconexiones) y server hammering (backoff exponencial reduce carga).

### Error handling

Errores en event handlers no afectan otros clientes:

```ts
try {
  const data = await fn(req)
  client.send({ event, data, error: null, sum: s, nav })
} catch (e) {
  client.send({ event, data: null, error: normalize(e).toJSON() })
}
```

### CSRF

SSE usa GET requests, no pasan por CSRF. CORS del browser protege automáticamente — EventSource está sujeto a CORS.

## Partes intervinientes

| Archivo | Rol en eventos |
|---------|---------------|
| `server.tsx` | Bus (`on`/`emit`), SSE middleware, registrations, auto-emit (`tap`/`binds`), `seal()`, `depSum()` |
| `app.tsx` | SSE connection (`connect`), `seals` map, nav cache update, `subscribers` map |
| `client.tsx` | SSR hydration de seals, `subscribe()` helper |
| `constants.ts` | Types (`EventState`, `EventCallback`), `sum()` hash function |
| `data/db.ts` | `TrackerPlugin`, `bump()`, `tap()`, `snapshot()`, `version()` |
| `handler.ts` | `events` export, `deps` export, `actions` con `emit()` manual |

## Auditoría de Seguridad

### Brechas Críticas

| # | Brecha | Laravel Reverb/Echo | Ajo-kit | Estado |
|---|--------|---------------------|---------|--------|
| 1 | **Revalidación de sesión** | Revalida en cada mensaje | Solo valida en conexión inicial | Abierta |
| 2 | **Permisos granulares** | Presence channels con `here()`, `joining()`, `leaving()` | Solo autorización binaria | Abierta |
| 3 | **CSRF para SSE** | Verifica Origin en connection | CORS del browser protege | Cerrada |
| 4 | **Límite conexiones por user** | Configurable per-user limits | `SSE_MAX_PER_USER = 5`, responde 429 | Cerrada |
| 5 | **Rate limiting eventos** | Throttle en broadcast | Sin throttle en emit | Abierta |
| 6 | **Logging/Auditoría** | Logs de conexión/desconexión | Sin logs de SSE | Abierta |
| 7 | **Heartbeat** | Ping/pong configurable | 30s heartbeat, limpia zombies | Cerrada |
| 8 | **Exponential backoff** | SDK con backoff + jitter | Backoff 1s→30s + jitter, reset on open | Cerrada |

Las brechas abiertas son features incrementales, no vulnerabilidades de seguridad activas.

## Comparación con la Industria

| Feature | Laravel | Phoenix | SvelteKit | Ajo-kit |
|---------|---------|---------|-----------|---------|
| Zero config | ✗ | ✗ | ~ | ✓ |
| Auth compartida página/SSE | ✗ | ~ | ✗ | ✓ |
| SSE-on-connect (initial data) | ✗ | ✓ (mount) | ✗ | ✓ |
| SSE-on-connect skip (seals) | ✗ | ✗ | ✗ | ✓ |
| Auto-emit (table writes) | ✗ | ✗ | ✗ | ✓ |
| Nav cache via SSE | ✗ | ✗ | ✗ | ✓ |
| Presence | ✓ | ✓ | ✗ | ✗ |
| Horizontal scaling | ✓ | ✓ | ✗ | ✗ |
| Colocation events+page+actions | ✗ | ✓ | ✗ | ✓ |

## Ventajas

1. **Zero infraestructura extra** — no WebSocket server, no Redis, no queues. Un solo proceso Node.js sirve HTML, SSE, y API.
2. **Auth unificada** — los wares protegen página y SSE con el mismo código.
3. **SSE-on-connect con skip** — data inicial solo cuando es necesaria, seals evitan redundancia.
4. **Auto-emit** — las tablas disparan eventos automáticamente via `TrackerPlugin` + `tap()`.
5. **Nav cache sync** — SSE actualiza el navigation cache del cliente, evitando re-fetches en re-navegación.
6. **Colocation total** — events, page, actions en el mismo `handler.ts`.
7. **Filtrado por ruta** — `emit('messages', { id: '5' })` sin configuración de channels.

## Desventajas

1. **No bidireccional** — SSE es server→client. Client→server usa actions (HTTP POST).
2. **No presence** — no hay concepto de "quién está conectado".
3. **No horizontal scaling** — bus en-memoria = single process. Necesita Redis adapter para multi-server.
4. **Boilerplate DX** — duplicación page() ↔ events (misma query), estado manual en el cliente.
5. **Sin type-safety** — strings para nombres de eventos, sin validación de payload.

## Análisis Profundo & Patrones

### Patrón Idiomático: `events = { name: page }`

El 75% de los handlers con eventos simplemente reusan la función `page()`:

```ts
export const deps = ['sessions', ':user']
export async function page(req) { ... }
export const events = { sessions: page }
```

Esto es intencional — una sola línea de boilerplate explícito es preferible a auto-generación mágica. El nombre del evento puede diferir del segmento de ruta, y la explicitness es una feature.

### Microtask Coalescer (Capacitor Pattern)

El patrón de debouncing en auto-emit es un **coalescedor por microtask** — acumula escrituras síncronas y las despacha en un solo batch asíncrono:

```ts
const pending = new Set<string>()
tap(table => {
  const names = binds.get(table)
  if (!names) return
  if (!pending.size) queueMicrotask(() => {
    pending.forEach(name => emit(name))
    pending.clear()
  })
  names.forEach(name => pending.add(name))
})
```

El guard `if (!pending.size)` asegura que solo se agenda un microtask. Este patrón aparece en React (state batching) y write-ahead logs de bases de datos.

**Analogía física:** Funciona como un **capacitor** — acumula carga (eventos pendientes) durante un burst síncrono, y descarga todo de una vez en el siguiente microtask.

### Delta Encoding (Optimización Futura)

El sistema actual envía payloads completos. Teoría de la información dice que la codificación óptima transmite solo entropía (información nueva). Para eventos como "nuevo mensaje en chat", el array completo de mensajes tiene baja entropía — la mayoría no cambió.

JSON Patch (RFC 6902) podría reducir bandwidth 80-95% para updates incrementales. No implementar ahora — el sistema `seal/skip` ya evita transmisiones innecesarias a nivel de conexión. Revisitar si el tamaño de payloads se vuelve bottleneck.

**Paralelo biológico:** Las neuronas no retransmiten el estado completo del cerebro — disparan potenciales de acción (spikes) codificando solo cambios. Auto-emit ya es spike-like (dispara al cambiar), pero el payload sigue siendo "estado completo."

### deps Manuales vs Tracking Automático

**Concepto (SolidJS, MobX, Vue):** Trackear dependencias automáticamente observando qué tablas se leen durante la ejecución del handler.

**Veredicto:** No implementar. Un handler que condicionalmente consulta tablas diferentes tendría deps no-determinísticos. El array manual de `deps` es una declaración estática, predecible y auditable — es un contrato: "este handler depende de exactamente estas tablas."

### Analogía: Publish-Subscribe como Sistema Nervioso

| Biología | Ajo-kit |
|----------|---------|
| Estímulo sensorial | Database write (INSERT/UPDATE/DELETE) |
| Neurona receptora | `TrackerPlugin.transformQuery()` |
| Nervio aferente | `bump()` → `tap()` hook |
| Médula espinal (relevo) | `binds` map (tabla → eventos) |
| Neuronas motoras | `emit()` → bus listeners |
| Fibras musculares | `client.send()` → browser EventSource |
| Arco reflejo | Auto-emit (estímulo → respuesta sin intervención consciente) |
| Acción voluntaria | Manual `emit()` (deliberado, filtrado por params) |

El **arco reflejo** es la analogía más apta: auto-emit bypassa la intervención "consciente" (del developer), creando un loop automático estímulo-respuesta. Manual emit es como control muscular voluntario — requiere intención explícita.

### Observer Effect & Lazy Evaluation

El sistema ya optimiza para el efecto observador — SSE solo conecta si `subscribers.size > 0`. Sin observadores → sin computación. Route-matching sirve como proxy suficiente para "interesado" — el server no necesita saber qué eventos específicos suscribió el cliente.

### Content-Addressable Storage

`depSum` ya implementa este patrón (de Git, IPFS): el sum se computa desde versiones de tablas + user + ttl + key. Si dos eventos dependen de las mismas tablas y no cambiaron, producen el mismo base sum (diferenciado solo por key).
