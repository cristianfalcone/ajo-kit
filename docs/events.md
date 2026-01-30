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

```ts
// server.tsx - bus global en memoria
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

### handler.ts - Definir eventos

```ts
// src/(app)/account/chats/[id]/handler.ts
import { emit } from '/src/server'

export async function page(req: Request) {
  const chatId = Number(req.params.id)
  const messages = await db()
    .selectFrom('messages')
    .where('chat', '=', chatId)
    .execute()

  return { messages }
}

// Eventos - retornan data que se envía al cliente
export const events = {
  messages: async (req: Request) => {
    const chatId = Number(req.params.id)
    const messages = await db()
      .selectFrom('messages')
      .where('chat', '=', chatId)
      .execute()

    return { messages }
  }
}

// Actions pueden emitir eventos
export const actions = {
  send: async (req: Request) => {
    const chatId = Number(req.params.id)
    await db().insertInto('messages').values({ ... }).execute()

    emit('messages', { id: String(chatId) })
    return { ok: true }
  }
}
```

### wares.ts - Proteger ruta

Los wares protegen tanto la página como SSE automáticamente:

```ts
// src/(app)/account/chats/[id]/wares.ts
import type { Middleware } from 'polka'
import { db } from '/src/data'
import { ForbiddenError } from '/src/constants'

export default [
  async (req, _, next) => {
    const participant = await db()
      .selectFrom('participants')
      .where('chat', '=', Number(req.params.id))
      .where('user', '=', req.user!.id)
      .select('user')
      .executeTakeFirst()

    if (!participant) throw new ForbiddenError('Not a participant')
    next()
  }
] satisfies Middleware[]
```

### SSE Middleware

El middleware `sse` intercepta requests con `Accept: text/event-stream`:

```ts
// server.tsx
const SSE_MAX_PER_USER = 5
const SSE_HEARTBEAT_MS = 30_000

const sse: Middleware = (req, res, next) => {
  if (req.headers.accept !== 'text/event-stream') return next()

  // Per-user connection limits
  if (req.user) {
    const count = [...clients].filter(c => c.req.user?.id === req.user!.id).length
    if (count >= SSE_MAX_PER_USER) {
      res.writeHead(429)
      res.end()
      return
    }
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  res.flushHeaders()

  const client: SSEClient = {
    req,
    send: (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  clients.add(client)

  // Send initial event data for all matching registrations
  for (const { route, name, handler } of registrations) {
    const match = route.pattern.exec(client.req.path)
    if (!match) continue
    const extracted = route.keys.reduce(
      (acc, key, i) => ({ ...acc, [key]: match[i + 1] }),
      {} as Record<string, string>
    )
    handler(Object.assign(Object.create(client.req), { params: extracted }) as Request)
      .then(data => client.send({ event: name, data, error: null }))
      .catch(() => {})
  }

  // Heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    if (!res.write(':heartbeat\n\n')) {
      clearInterval(heartbeat)
      clients.delete(client)
    }
  }, SSE_HEARTBEAT_MS)

  req.socket?.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(client)
  })
}

// Page registration - wares run before sse
app.get(path, json(), ...wares, sse, data(page), render)
```

### Event Registration & Dispatch

Cuando se carga un handler con `events`, se registra un listener en el bus y se almacena en `registrations` (para SSE-on-connect):

```ts
type EventRegistration = {
  route: { pattern: RegExp, keys: string[] }
  name: string
  handler: EventHandler
}

const registrations: EventRegistration[] = []

// Durante setup de handlers:
if (events) {
  // Layout-level events: trailing group → prefix match
  const trailing = reGroup.test(segments.at(-1) ?? '')
  const route = parse(`/${trailing ? (pattern ? pattern + '/*' : '*') : pattern}`)

  for (const [name, fn] of Object.entries(events)) {
    registrations.push({ route, name, handler: fn })

    on(name, async (params) => {
      for (const client of clients) {
        const match = route.pattern.exec(client.req.path)
        if (!match) continue

        const extracted = route.keys.reduce(
          (acc, key, i) => ({ ...acc, [key]: match[i + 1] }),
          {} as Record<string, string>
        )

        // Filter by emit params
        const skip = Object.entries(params).some(
          ([k, v]) => extracted[k] !== undefined && extracted[k] !== v
        )
        if (skip) continue

        try {
          const req = Object.assign(Object.create(client.req), { params: extracted }) as Request
          const data = await fn(req)
          client.send({ event: name, data, error: null })
        } catch (e) {
          const error = normalize(e)
          client.send({ event: name, data: null, error: error.toJSON() })
        }
      }
    })
  }
}
```

### Layout-level Events (Trailing Group Detection)

Los eventos en layout handlers (donde el último segmento es un grupo) matchean **todos los subpaths**, no solo la ruta exacta.

| Handler | Último segmento | Event pattern | Matchea |
|---------|----------------|---------------|---------|
| `(app)/handler.ts` | `(app)` → grupo | `/*` | Todo |
| `account/(settings)/handler.ts` | `(settings)` → grupo | `/account/*` | Todo bajo `/account` |
| `account/chats/handler.ts` | `chats` → no grupo | `/account/chats` | Solo exacto |
| `account/chats/[id]/handler.ts` | `[id]` → no grupo | `/account/chats/:id` | Solo con `:id` |

Esto permite definir eventos globales en layouts que notifican a todos los clientes bajo esa ruta:

```ts
// src/(app)/handler.ts - matchea /* (todas las páginas autenticadas)
export const events = {
  unread: async (req: Request) => {
    const unread = await unreadCount(req.user!.id)
    return { unread }
  }
}
```

### SSE-on-Connect (Initial Data)

Cuando un cliente establece la conexión SSE, el server ejecuta **todos los event handlers que matchean** la ruta del cliente y envía los resultados. Esto resuelve la race condition entre navegación y SSE:

```
1. Browser navega a /account/chats/5
2. page() se ejecuta (marca chat como seen, retorna messages)
3. HTML se renderiza con unread=1 del layout (calculado antes de page())
4. SSE se conecta a /account/chats/5
5. SSE-on-connect ejecuta events.unread → retorna { unread: 0 } (ya seen)
6. Badge se actualiza a 0
```

Sin SSE-on-connect, el badge quedaría en 1 hasta que alguien emitiera `unread`.

### emit() con Parámetros (Filtrado)

`emit()` acepta params opcionales que filtran qué clientes reciben el evento:

```ts
// Solo notificar clientes viendo chat 5
emit('messages', { id: '5' })
// → Solo matchea clientes donde route.keys extrae id='5'

// Notificar a todos los clientes que matchean el evento
emit('unread')
// → Sin params, notifica a todos los que matchean la ruta del evento
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

```ts
// app.tsx
const sse = { source: null as EventSource | null, retries: 0 }

const connect = (path: string) => {
  sse.source?.close()
  subscribers.clear()

  sse.source = new EventSource(path)

  sse.source.onopen = () => { sse.retries = 0 }

  sse.source.onmessage = (e) => {
    const { event, data, error } = JSON.parse(e.data)
    subscribers.get(event)?.forEach(fn => fn({ data, error }))
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
    component.next()
  }

  if (!subscribers.has(name)) subscribers.set(name, new Set())
  subscribers.get(name)!.add(wrapped)
}
```

### Uso en page.tsx

```tsx
const ChatRoom: Stateful<PageArgs<Data>> = function* (args) {
  let messages = args.data?.messages ?? []

  // Subscribe to real-time updates
  subscribe<{ messages: Message[] }>('messages', ({ data, error }) => {
    if (error) return
    messages = data!.messages
  })

  while (true) {
    yield (
      <ul>
        {messages.map(m => <li key={m.id}>{m.text}</li>)}
      </ul>
    )
  }
}
```

### Pitfall: No sobrescribir estado reactivo con args.data

Cuando un componente usa `subscribe()` para datos reactivos, **no se debe re-asignar desde `args.data` dentro del loop**. El callback de `subscribe()` llama a `component.next()` que re-ejecuta el loop — si el loop sobrescribe el estado con `args.data` (que es stale), se pierde la actualización SSE:

```tsx
// MAL — args.data sobrescribe el estado SSE en cada re-render
const List: Stateful<PageArgs<Data>> = function* (args) {
  let items = args.data?.items ?? []

  subscribe<{ items: Item[] }>('items', ({ data, error }) => {
    if (error) return
    items = data!.items  // ← se actualiza...
  })

  while (true) {
    const { data } = args
    if (data?.items) items = data.items  // ← ...pero se sobrescribe aquí
    yield <ul>{items.map(i => <li>{i.name}</li>)}</ul>
  }
}

// BIEN — solo usar el estado reactivo
const List: Stateful<PageArgs<Data>> = function* (args) {
  let items = args.data?.items ?? []

  subscribe<{ items: Item[] }>('items', ({ data, error }) => {
    if (error) return
    items = data!.items
  })

  while (true) {
    yield <ul>{items.map(i => <li>{i.name}</li>)}</ul>
  }
}
```

La inicialización `args.data?.items ?? []` antes del loop es correcta — captura el valor SSR inicial. Después, `subscribe()` maneja las actualizaciones.

## Flujo Completo

### Chat con mensajes real-time

```
1. User A en /account/chats/5
   └─ Browser: GET /account/chats/5 (Accept: text/html)
   └─ wares.ts verifica participante ✓
   └─ page() retorna messages, marca chat como seen
   └─ Render HTML

2. User A conecta EventSource
   └─ EventSource: GET /account/chats/5 (Accept: text/event-stream)
   └─ wares.ts verifica participante ✓
   └─ sse middleware acepta conexión
   └─ SSE-on-connect: ejecuta events.messages → envía mensajes actuales
   └─ SSE-on-connect: ejecuta events.unread → envía { unread: 0 }
   └─ subscribe('messages', callback) registra callback

3. User B envía mensaje
   └─ POST /account/chats/5?/send
   └─ actions.send() inserta mensaje
   └─ emit('messages', { id: '5' })
   └─ emit('chats')

4. Server procesa emit('messages')
   └─ Match: client A path === '/account/chats/5' ✓
   └─ events.messages() ejecuta query, marca seen
   └─ client.send({ event: 'messages', data: {...}, error: null })
   └─ Dentro del handler: emit('unread'), emit('chats')

5. Server procesa emit('unread')
   └─ Match: route /* matchea todos los clientes ✓
   └─ events.unread() calcula conteo global
   └─ Todos los clientes reciben { unread: N }

6. Server procesa emit('chats')
   └─ Match: route /account/chats matchea clientes en la lista ✓
   └─ events.chats() retorna lista actualizada con unread por chat
   └─ Clientes en la lista reciben chats actualizados

7. User A recibe
   └─ callback({ data, error }) actualiza messages
   └─ component.next() → re-render
```

### Badge global con SSE-on-connect

```
1. User A tiene 3 unread messages
   └─ layout() retorna { unread: 3 }
   └─ Nav renderiza badge "3"

2. User A navega a /account/chats/5 (chat con los 3 unread)
   └─ SSE se cierra (navegación)
   └─ page() marca chat como seen
   └─ layout() se re-ejecuta → retorna { unread: 0 }? No: layout usa cache (deps)
   └─ HTML renderiza con unread del cache (posiblemente stale)

3. SSE reconecta en /account/chats/5
   └─ SSE-on-connect ejecuta events.unread
   └─ seen ya actualizado por page() → { unread: 0 }
   └─ Badge se actualiza a 0
```

## Seguridad

### Autorización automática

Los wares de la ruta protegen tanto página como SSE:

- User no participante → wares.ts throw ForbiddenError
- No puede ver página NI conectar SSE
- Un solo lugar para la lógica de autorización (DRY)

### CSRF Protection

SSE usa GET requests, que no pasan por validación CSRF. Sin embargo:

- **CORS del browser** protege automáticamente — EventSource está sujeto a CORS
- Sitios maliciosos no pueden conectar SSE cross-origin sin headers CORS explícitos

### Connection Limits

Máximo 5 conexiones SSE por usuario para prevenir DoS:

```ts
const SSE_MAX_PER_USER = 5

if (req.user) {
  const count = [...clients].filter(c => c.req.user?.id === req.user!.id).length
  if (count >= SSE_MAX_PER_USER) {
    res.writeHead(429)  // Too Many Requests
    res.end()
    return
  }
}
```

### Heartbeat

Heartbeat cada 30s para detectar conexiones zombie:

```ts
const SSE_HEARTBEAT_MS = 30_000

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
// 1s, 2s, 4s, 8s... max 30s + random jitter
const base = Math.min(1000 * 2 ** sse.retries, 30_000)
const jitter = base * Math.random()
setTimeout(() => connect(path), base + jitter)
```

Esto previene:
- **Thundering herd** — jitter distribuye reconexiones
- **Server hammering** — backoff exponencial reduce carga

### Error handling

Errores en event handlers no afectan otros clientes:

```ts
try {
  const data = await fn(req)
  client.send({ event, data, error: null })
} catch (e) {
  client.send({ event, data: null, error: normalize(e).toJSON() })
}
```

El cliente recibe el error y puede manejarlo:

```ts
subscribe('messages', ({ data, error }) => {
  if (error) {
    console.error('Event error:', error)
    return
  }
  messages = data!.messages
})
```

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
| 9 | **Filtrado de eventos** | Client whisper, private broadcasts | Broadcast a todos los subscribers | Abierta |
| 10 | **Validación de payload** | Schema validation en eventos | Sin validación | Abierta |

### Brechas Moderadas

| # | Brecha | Impacto | Estado |
|---|--------|---------|--------|
| 1 | Sin métricas de conexiones | No visibility en uso | Abierta |
| 2 | Sin graceful shutdown | Conexiones cortadas abruptamente | Abierta |
| 3 | Sin compression | Bandwidth innecesario | Abierta |
| 4 | Sin reconnection token | Estado perdido en reconnect | Abierta |
| 5 | Sin message ordering | Eventos pueden llegar desordenados | Abierta |
| 6 | Sin deduplication | Mismo evento puede llegar 2x | Abierta |
| 7 | Sin channel namespacing | Colisión de nombres posible | Abierta |
| 8 | Sin connection metadata | No info de device/location | Abierta |

Las 6 críticas abiertas son features incrementales, no vulnerabilidades de seguridad activas.

## Migración a Redis (futuro)

```ts
// bus.ts
const adapter = process.env.REDIS_URL
  ? createRedisAdapter(process.env.REDIS_URL)
  : createMemoryAdapter()

export const on = adapter.on
export const emit = adapter.emit
```

## Comparación con la Industria

### Laravel Reverb + Echo

| Aspecto | Reverb/Echo | Ajo-kit |
|---------|-------------|---------|
| Transporte | WebSocket (full-duplex) | SSE (unidireccional) |
| Infra | Servidor separado (Reverb) | Mismo server HTTP |
| Channels | Public, Private, Presence | Implícito por ruta |
| Auth | Por channel con callback | Por wares (compartido con página) |
| Client API | `Echo.channel('chat.5').listen('MessageSent', cb)` | `subscribe('messages', cb)` |
| Scaling | Redis pub/sub built-in | Solo en-memoria |
| Complejidad config | Alta (config, server, queues) | Zero |

**Ventaja Reverb**: Channels tipados, presence (quién está online), private channels con auth granular, horizontal scaling con Redis.

**Ventaja ajo-kit**: Zero config, mismo server, auth compartida con la página, sin infraestructura adicional.

### Phoenix LiveView + Channels

| Aspecto | Phoenix | Ajo-kit |
|---------|---------|---------|
| Modelo | Server-rendered stateful (cada view es un proceso Erlang) | Client-side generators + SSE |
| Presence | CRDT distribuido, sin single point of failure | No existe |
| PubSub | Distribuido (pg2/Redis) | En-memoria |
| DX | `assign()` + templates reactivos automáticos | Estado manual + `subscribe()` |
| Scaling | Millones de conexiones (Erlang VM) | Limitado por Node.js |

Phoenix es el gold standard en real-time DX. Cada LiveView es un proceso — el estado vive en el server y se sincroniza automáticamente. No hay "event handlers" separados; el template se re-renderiza cuando cambia el state.

### SvelteKit + sveltekit-sse

| Aspecto | SvelteKit SSE | Ajo-kit |
|---------|---------------|---------|
| Server | Resource route dedicada (`+server.ts`) | Misma ruta (detecta Accept header) |
| Client | `source('/path').select('event')` → Svelte store | `subscribe('messages', cb)` |
| Reactivity | Store nativo (auto-update UI) | Manual (`component.next()` via callback) |
| Auth | Separada de la página | Compartida via wares |

**Ventaja SvelteKit**: Stores hacen que la UI se actualice automáticamente, API declarativa.

**Ventaja ajo-kit**: No necesita ruta separada, wares compartidos, SSE-on-connect.

### Remix SSE

| Aspecto | Remix | Ajo-kit |
|---------|-------|---------|
| Pattern | Resource route + `eventStream()` helper | Integrado en handler |
| Client | `useEventStream()` hook | `subscribe()` en generator |
| Integración | Librerías comunitarias (no nativo) | First-class |

Remix no tiene soporte nativo para SSE — depende de `remix-utils` o `remix-sse`. Requiere rutas separadas.

### Resumen

| Feature | Laravel | Phoenix | SvelteKit | Remix | Ajo-kit |
|---------|---------|---------|-----------|-------|---------|
| Zero config | ✗ | ✗ | ~ | ~ | ✓ |
| Auth compartida página/SSE | ✗ | ~ | ✗ | ✗ | ✓ |
| SSE-on-connect (initial data) | ✗ | ✓ (mount) | ✗ | ✗ | ✓ |
| Presence | ✓ | ✓ | ✗ | ✗ | ✗ |
| Horizontal scaling | ✓ | ✓ | ✗ | ✗ | ✗ |
| Colocation events+page+actions | ✗ | ✓ | ✗ | ✗ | ✓ |
| Reactivity automática | ✓ (Livewire) | ✓ | ✓ (stores) | ✓ (hooks) | ✗ (manual) |

## Ventajas del Approach Actual

1. **Zero infraestructura extra** — no WebSocket server, no Redis, no queues. Un solo proceso Node.js sirve HTML, SSE, y API.

2. **Auth unificada** — los wares protegen página y SSE con el mismo código. Un solo lugar para lógica de autorización (DRY). Ningún otro framework comparado logra esto tan limpiamente.

3. **SSE-on-connect** — al conectar, el server ejecuta todos los event handlers que matchean la ruta y envía data inicial. Resuelve la race condition entre navegación y SSE que la mayoría de frameworks ignoran.

4. **Colocation total** — events, page, actions viven en el mismo `handler.ts`. No hay archivos de configuración separados, ni rutas dedicadas para SSE.

5. **Filtrado por ruta** — `emit('messages', { id: '5' })` solo notifica clientes cuya ruta extrae `id='5'`. Elegante y sin configuración de channels.

6. **Compatibilidad con firewalls** — SSE usa HTTP estándar. No tiene los problemas de WebSockets con firewalls corporativos (SophosXG, WatchGuard, McAfee Web Gateway).

## Desventajas del Approach Actual

1. **No bidireccional** — SSE es server→client. Para client→server se usan actions (HTTP POST). En la práctica no es un problema porque ajo-kit ya tiene actions, pero impide patterns como typing indicators en tiempo real.

2. **No presence** — no hay concepto de "quién está conectado". Phoenix tiene CRDT distribuido, Laravel tiene Presence Channels. Importante para chats, collaborative editing.

3. **No horizontal scaling** — bus en-memoria = single process. Necesita Redis adapter para multi-server (la sección "Migración a Redis" ya lo contempla).

4. **Boilerplate DX** — duplicación page() ↔ events (misma query), emit() manual en actions (fácil olvidar), estado manual en el cliente.

5. **Sin type-safety** — strings para nombres de eventos, sin validación de payload. `emit('mesages')` (typo) falla silenciosamente.

6. **Sin reactivity automática** — el dev debe manejar `let variable` + callback + `component.next()` manualmente. SvelteKit, Phoenix y Laravel actualizan la UI automáticamente.

## Propuestas de Simplificación DX

### A. Events como array → re-ejecutar page()

El 80% de event handlers repiten la query del page handler. Propuesta: declarar eventos como array que re-ejecuta `page()`:

```ts
// ACTUAL — duplicación
export async function page(req) {
  return { messages: await getMessages(req.params.id) }
}
export const events = {
  messages: async (req) => {
    return { messages: await getMessages(req.params.id) }  // misma query
  }
}

// PROPUESTA
export async function page(req) {
  return { messages: await getMessages(req.params.id) }
}
export const events = ['messages']  // re-ejecuta page() cuando se emite 'messages'
```

Para casos donde el evento necesita data diferente a page(), mantener objetos como escape hatch.

### B. Auto-emit desde actions

```ts
// ACTUAL — fácil olvidar el emit()
export const actions = {
  send: async (req) => {
    await db().insertInto('messages').values({...}).execute()
    emit('messages', { id: req.params.id })  // manual
    return { ok: true }
  }
}

// PROPUESTA — declarativo
export const actions = {
  send: {
    emits: ['messages'],  // auto-emit después de ejecutar handler
    handler: async (req) => {
      await db().insertInto('messages').values({...}).execute()
      return { ok: true }
    }
  }
}
```

### C. Helper `live()` — estado reactivo sin boilerplate

```tsx
// ACTUAL — estado manual, pitfall documentado
const Page: Stateful<PageArgs<Data>> = function* (args) {
  let messages = args.data?.messages ?? []
  subscribe<{ messages: Message[] }>('messages', ({ data, error }) => {
    if (error) return
    messages = data!.messages
  })
  while (true) {
    yield <ul>{messages.map(m => <li>{m.text}</li>)}</ul>
  }
}

// PROPUESTA — live() combina estado inicial + suscripción
const Page: Stateful<PageArgs<Data>> = function* (args) {
  const messages = live('messages', args.data?.messages ?? [], d => d.messages)
  //                     ^evento     ^valor inicial              ^extractor
  while (true) {
    yield <ul>{messages().map(m => <li>{m.text}</li>)}</ul>
  }
}
```

`live()` internamente llama a `subscribe()`, maneja errores, y retorna un getter. Elimina el pitfall de sobrescribir estado con `args.data`.

### D. Combinación A + C → `live(args)`

Si events es un array (propuesta A), el framework sabe que el evento re-ejecuta `page()`. Entonces:

```tsx
// handler.ts
export async function page(req) {
  return { messages: await getMessages(req.params.id) }
}
export const events = ['messages']

// page.tsx — máxima simplicidad
const Page: Stateful<PageArgs<Data>> = function* (args) {
  const data = live(args)  // auto-subscribe a todos los events del handler
  while (true) {
    yield <ul>{data().messages.map(m => <li>{m.text}</li>)}</ul>
  }
}
```

Un solo `live(args)` suscribe a todos los eventos declarados y mantiene `data()` actualizado. Comparable en DX a Phoenix LiveView o SvelteKit stores.
