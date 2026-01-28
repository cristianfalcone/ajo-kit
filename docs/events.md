# Events: Real-time Server → Client

Contraparte de **Actions** (cliente → servidor). Los eventos fluyen del servidor al cliente via SSE.

## Simetría con Actions

| Aspecto | Actions | Events |
|---------|---------|--------|
| Dirección | Cliente → Server | Server → Cliente |
| Transporte | HTTP POST | SSE |
| Búsqueda | Scan left (page → root) | Scan right (root → page) |
| Definición | `export const actions = {}` | `export const events = {}` |
| Invocación server | - | `emit(name, params?)` |
| Helper cliente | `action(name)` | `event(name, callback)` |

## Server Side

### Event Bus (en server.tsx)

```ts
// Bus global en memoria (migrable a Redis)
type Listener = (params: any) => void
const listeners = new Map<string, Set<Listener>>()

export function on(name: string, listener: Listener) {
  if (!listeners.has(name)) listeners.set(name, new Set())
  listeners.get(name)!.add(listener)
  return () => listeners.get(name)!.delete(listener)
}

export function emit(name: string, params?: Record<string, any>) {
  listeners.get(name)?.forEach(fn => fn(params))
}
```

### Registro de Event Listeners (en server.tsx)

Cuando se procesan los `handler.ts` files, se registran los `events` exports como listeners:

```ts
// Durante el procesamiento de rutas
for (const route of routes) {
  const handler = await import(route.handlerPath)

  if (handler.events) {
    for (const [name, fn] of Object.entries(handler.events)) {
      on(name, async (params) => {
        // Verificar si los params matchean esta ruta
        if (!matchParams(route, params)) return

        // Obtener clientes SSE suscritos a esta ruta
        const clients = getClientsForRoute(route, params)

        // Ejecutar función del evento para obtener payload
        for (const client of clients) {
          const req = buildRequest(client, params)
          const payload = await fn(req)
          client.send({ event: name, payload })
        }
      })
    }
  }
}
```

### handler.ts - Definir eventos

```ts
// src/(app)/chat/[room]/handler.ts

// Data inicial
export async function page(req: Request) {
  const messages = await db()
    .selectFrom('messages')
    .select(['id', 'text', 'user_id', 'created'])
    .where('room_id', '=', req.params.room)
    .orderBy('created', 'desc')
    .limit(10)
    .execute()

  const typing = await db()
    .selectFrom('typing')
    .select(['user_id', 'active'])
    .where('room_id', '=', req.params.room)
    .execute()
    .then(rows => Object.fromEntries(rows.map(r => [r.user_id, r.active])))

  return { messages, typing }
}

// Eventos - payload siempre es un objeto (igual que args.data)
export const events = {
  // Retorna los últimos 10 mensajes actualizados
  messages: async (req: Request) => {
    const messages = await db()
      .selectFrom('messages')
      .select(['id', 'text', 'user_id', 'created'])
      .where('room_id', '=', req.params.room)
      .orderBy('created', 'desc')
      .limit(10)
      .execute()

    return { messages }
  },

  // Retorna mapa de userId → active
  typing: async (req: Request) => {
    const typing = await db()
      .selectFrom('typing')
      .select(['user_id', 'active'])
      .where('room_id', '=', req.params.room)
      .execute()
      .then(rows => Object.fromEntries(rows.map(r => [r.user_id, r.active])))

    return { typing }
  }
}
```

### Emitir eventos (desde cualquier lugar)

```ts
import { emit } from './server'

// Desde una action
export const actions = {
  send: async (req, res) => {
    await db()
      .insertInto('messages')
      .values({ room_id: req.params.room, text: req.body.text, user_id: req.user.id })
      .execute()

    emit('messages', { room: req.params.room })
    return { success: true }
  },

  startTyping: async (req, res) => {
    await db()
      .insertInto('typing')
      .values({ room_id: req.params.room, user_id: req.user.id, active: true })
      .onConflict(oc => oc.columns(['room_id', 'user_id']).doUpdateSet({ active: true }))
      .execute()

    emit('typing', { room: req.params.room })
    return { success: true }
  }
}

// Desde un cron
cron('0 * * * *', () => emit('stats'))

// Desde un webhook
app.post('/webhook', (req) => {
  emit('payment', { userId: req.body.userId })
})
```

## Client Side (client.tsx)

### SSE Connection

```ts
// Conexión SSE por ruta actual
let eventSource: EventSource | null = null
const eventCallbacks = new Map<string, Set<(payload: any) => void>>()

function connectSSE(path: string) {
  eventSource?.close()
  eventSource = new EventSource(`/sse?path=${encodeURIComponent(path)}`)

  eventSource.onmessage = (e) => {
    const { event, payload } = JSON.parse(e.data)
    eventCallbacks.get(event)?.forEach(fn => fn(payload))
  }
}

// Reconectar en navegación
navigate = (path) => {
  // ... navegación existente ...
  connectSSE(path)
}
```

### Helper event()

```ts
export function event<T>(name: string, callback: (payload: T) => void | Promise<void>) {
  if (!eventCallbacks.has(name)) eventCallbacks.set(name, new Set())
  eventCallbacks.get(name)!.add(async (payload) => {
    await callback(payload)
    currentComponent?.next()  // Auto re-render
  })

  // Cleanup en navegación (automático por el sistema de componentes)
  onCleanup(() => eventCallbacks.get(name)!.delete(callback))
}
```

**Nota:** El helper `action()` también debería moverse de `app.tsx` a `client.tsx` para consistencia - ambos son helpers exclusivamente del cliente.

### Uso en page.tsx / layout.tsx

```tsx
export default function* ChatRoom(args: Args) {
  // Data inicial del handler
  let { messages, typing } = args.data

  // Suscribirse a eventos - payload se destructura igual que args.data
  event('messages', ({ messages: updated }) => {
    messages = updated
  })

  event('typing', ({ typing: updated }) => {
    typing = updated
  })

  const typingUsers = Object.entries(typing).filter(([_, active]) => active)

  return (
    <div>
      <ul>
        {messages.map(m => <li key={m.id}>{m.text}</li>)}
      </ul>
      {typingUsers.length > 0 && <p>{typingUsers.map(([id]) => id).join(', ')} typing...</p>}
    </div>
  )
}
```

## SSE Endpoint (en server.tsx)

```ts
// GET /sse?path=/chat/room-123
app.get('/sse', (req, res) => {
  const path = req.query.path

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Registrar cliente
  const client = { id: crypto.randomUUID(), path, send: (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }}

  sseClients.add(client)

  req.on('close', () => sseClients.delete(client))
})
```

## Matching de Params

Cuando `emit('messages', { room: 'abc' })` se llama:

1. Bus notifica a todos los listeners de `'messages'`
2. Cada listener (de cada handler.ts) verifica si los params matchean su ruta
3. `/chat/[room]/handler.ts` matchea si `params.room` coincide con el `[room]` de la ruta
4. Solo los clientes SSE en `/chat/abc` reciben el evento

```ts
function matchParams(route: Route, params: Record<string, any>): boolean {
  // route.pattern = '/chat/:room'
  // params = { room: 'abc' }
  // Verificar que los params dinámicos coincidan
  for (const [key, value] of Object.entries(params)) {
    if (route.params[key] !== undefined && route.params[key] !== value) {
      return false
    }
  }
  return true
}
```

## Scope de Eventos

Los eventos definidos en un `handler.ts` solo pueden ser escuchados por:
- La página en ese nivel
- Layouts hijos (hacia la derecha del path)

```
/(app)/handler.ts → events.notifications
    ↓ pueden escuchar
/(app)/layout.tsx
/(app)/chat/layout.tsx
/(app)/chat/[room]/page.tsx

/(app)/chat/[room]/handler.ts → events.messages, events.typing
    ↓ puede escuchar
/(app)/chat/[room]/page.tsx  (solo este nivel)
```

## Auto-unsubscribe

Cuando el cliente navega:
1. Se cierra la conexión SSE actual
2. Se abre nueva conexión SSE para el nuevo path
3. Los callbacks registrados con `event()` se limpian automáticamente
4. Nuevos `event()` calls en la nueva página registran nuevos callbacks

## Flujo Completo

```
1. Cliente en /chat/room-abc
   └─ Abre SSE: GET /sse?path=/chat/room-abc
   └─ event('messages', callback) registra callback

2. Otro cliente hace action('send')
   └─ POST /chat/room-abc?/send
   └─ actions.send() inserta mensaje
   └─ emit('messages', { room: 'room-abc' })

3. Bus notifica listeners
   └─ /chat/[room]/handler.ts → events['messages']
   └─ Verifica: room === 'room-abc' ✓
   └─ Ejecuta función → { messages: [...] }

4. SSE envía a clientes en /chat/room-abc
   └─ { event: 'messages', payload: { messages: [...] } }

5. Cliente recibe
   └─ Callback: ({ messages: updated }) => messages = updated
   └─ component.next() → re-render
```

## Migración a Redis (futuro)

```ts
// bus.ts
const adapter = process.env.REDIS_URL
  ? createRedisAdapter(process.env.REDIS_URL)
  : createMemoryAdapter()

export const on = adapter.on
export const emit = adapter.emit
```

Redis permite:
- Múltiples instancias del servidor
- Persistencia de eventos
- Pub/sub distribuido

---

# Investigación: Implementación

## Libs candidatas

### [nanoevents](https://github.com/ai/nanoevents) (recomendada)
- **107 bytes** minified+brotli
- TypeScript nativo con generics
- API mínima: `on()` retorna unbind, `emit()`
- Sin dependencias

```ts
import { createNanoEvents } from 'nanoevents'

interface Events {
  messages: (params: { room: string }) => void
  typing: (params: { room: string }) => void
}

const bus = createNanoEvents<Events>()
const unbind = bus.on('messages', (params) => { ... })
bus.emit('messages', { room: 'abc' })
unbind()
```

### [mitt](https://github.com/developit/mitt)
- **200 bytes** gzipped
- Wildcard `*` para escuchar todos los eventos
- API: `on()`, `off()`, `emit()`

### Implementación propia (~50 bytes)
Dado lo simple del caso de uso, podemos implementar inline:

```ts
// En server.tsx
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

**Recomendación:** Implementación propia inline. Es tan simple que no justifica dependencia.

## Patrones existentes a reusar

### 1. Handler discovery (server.tsx:315-346)

Ya tenemos el patrón para descubrir exports de `handler.ts`:

```ts
const handlerFiles = import.meta.glob('/src/**/handler.{j,t}s{,x}')

for (const [file, loader] of Object.entries(handlerFiles)) {
  const { page, layout, head, deps, actions } = await loader()
  // Agregar: events
}
```

**Refactor:** Agregar `events` al destructuring y registrar listeners.

### 2. Route matching (regexparam via navaid)

Ya usamos navaid que internamente usa [regexparam](https://github.com/lukeed/regexparam):

```ts
import { parse } from 'regexparam'

const { pattern, keys } = parse('/chat/:room')
// pattern = /^\/chat\/([^/]+?)\/?$/
// keys = ['room']

const match = pattern.exec('/chat/abc')
// match[1] = 'abc' → { room: 'abc' }
```

**Uso para eventos:** Matchear params del emit con la ruta del handler.

### 3. Ancestor chain (constants.ts:73)

```ts
export const ancestors = (segments: string[]) =>
  segments.map((_, i) => segments.slice(0, i + 1).join('/'))

// ancestors(['(app)', 'chat', '[room]'])
// → ['(app)', '(app)/chat', '(app)/chat/[room]']
```

**Uso para eventos:** Determinar qué handlers pueden escuchar el evento (scan right).

### 4. Action resolution (server.tsx:260-276)

```ts
const action = (segments: string[]): Middleware => (req, _, next) => {
  const name = [...url.searchParams.keys()].find(k => k.startsWith('/'))?.slice(1)

  // Busca en ancestros (reverse = scan left)
  for (const path of ancestors(segments).filter(p => handlers.has(p)).reverse()) {
    const invoke = handlers.get(path)?.actions?.[name]
    if (invoke) { req.action = { name, invoke }; return next() }
  }
}
```

**Invertir para eventos:** Scan right en lugar de scan left.

## Refactors necesarios

### 1. PageHandler type (server.tsx:15-21)

```ts
// Antes
type PageHandler = {
  page?: ...
  layout?: ...
  head?: ...
  deps?: string[]
  actions: Record<string, (req: Request, res: Response) => Promise<unknown>>
}

// Después
type PageHandler = {
  page?: ...
  layout?: ...
  head?: ...
  deps?: string[]
  actions?: Record<string, (req: Request, res: Response) => Promise<unknown>>
  events?: Record<string, (req: Request) => Promise<Record<string, unknown>>>
}
```

### 2. Handler loading (server.tsx:330-340)

```ts
// Antes
const { default: api, page, layout, head, deps, actions } = exports

// Después
const { default: api, page, layout, head, deps, actions, events } = exports

// Registrar event listeners
if (events) {
  for (const [name, fn] of Object.entries(events)) {
    on(name, async (params) => {
      // Match route params
      if (!matchRoute(route, params)) return

      // Get SSE clients for this route
      const clients = getClients(route, params)

      for (const client of clients) {
        const payload = await fn(buildReq(client, params))
        client.send({ event: name, payload })
      }
    })
  }
}
```

### 3. SSE clients registry (server.tsx)

```ts
type SSEClient = {
  id: string
  path: string
  params: Record<string, string>
  user?: { id: number }
  send: (data: unknown) => void
}

const sseClients = new Set<SSEClient>()

const getClients = (route: Route, params: Record<string, unknown>) =>
  [...sseClients].filter(client =>
    matchRoute(route, client.params) &&
    matchParams(params, client.params)
  )
```

### 4. Mover action() a client.tsx

```ts
// client.tsx
export function action<T = unknown>(name?: string, init?: RequestInit): ActionState<T> {
  // ... implementación actual de app.tsx
}

export function event<T = Record<string, unknown>>(
  name: string,
  callback: (payload: T) => void | Promise<void>
) {
  // Registrar callback
  // Será llamado cuando SSE reciba evento con ese nombre
}
```

## SSE: Consideraciones técnicas

### Límite de conexiones
- HTTP/1.1: 6 conexiones por dominio/browser
- HTTP/2: ~100 streams negociables
- **Solución:** Una conexión SSE por tab, multiplexar eventos

### Reconnection automática
```ts
// Cliente
const connect = (path: string) => {
  const source = new EventSource(`/sse?path=${encodeURIComponent(path)}`)

  source.onmessage = (e) => {
    const { event, payload } = JSON.parse(e.data)
    callbacks.get(event)?.forEach(fn => fn(payload))
  }

  source.onerror = () => {
    source.close()
    setTimeout(() => connect(path), 1000)  // Reconnect
  }

  return source
}
```

### Keep-alive
```ts
// Server - enviar comentario cada 30s
setInterval(() => {
  for (const client of sseClients) {
    client.res.write(': heartbeat\n\n')
  }
}, 30000)
```

## Arquitectura final

```
┌─────────────────────────────────────────────────────────────┐
│                      server.tsx                              │
├─────────────────────────────────────────────────────────────┤
│  // Bus inline                                               │
│  const bus = new Map<string, Set<Listener>>()               │
│  export const on = (name, fn) => { ... }                    │
│  export const emit = (name, params) => { ... }              │
│                                                              │
│  // SSE clients                                              │
│  const sseClients = new Set<SSEClient>()                    │
│                                                              │
│  // Handler loading - registra events                        │
│  for (const [file, loader] of handlerFiles) {               │
│    const { events } = await loader()                        │
│    if (events) registerEventListeners(route, events)        │
│  }                                                           │
│                                                              │
│  // SSE endpoint                                             │
│  app.get('/sse', sseHandler)                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      client.tsx                              │
├─────────────────────────────────────────────────────────────┤
│  // SSE connection                                           │
│  let source: EventSource | null                             │
│  const callbacks = new Map<string, Set<Function>>()         │
│                                                              │
│  // Helpers                                                  │
│  export function action<T>(name) { ... }  // mover de app   │
│  export function event<T>(name, callback) { ... }           │
│                                                              │
│  // Connect on navigation                                    │
│  export function connectSSE(path: string) { ... }           │
└─────────────────────────────────────────────────────────────┘
```

## Consistencia con sistema actual

| Concepto | Actions | Events |
|----------|---------|--------|
| Export en handler.ts | `export const actions = {}` | `export const events = {}` |
| Helper cliente | `action<T>(name)` | `event<T>(name, callback)` |
| Transporte | HTTP POST | SSE |
| Procesamiento | Middleware chain | Bus + SSE broadcast |
| Params | `req.body`, `req.params` | `emit(name, params)` → `req.params` |
| Response | `return { data }` | `return { data }` → payload |

El patrón es simétrico y consistente con la arquitectura existente.
