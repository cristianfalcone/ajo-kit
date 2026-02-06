# Data: Loading, Cache, Events

Sistema de data de ajo-kit: carga datos en servidor y cliente en paralelo, cachea con sums basados en versiones de tablas, transmite solo lo que cambio via per-key deps, y sincroniza en tiempo real via SSE con auto-emit.

---

## Arquitectura

| Archivo | Rol |
|---------|-----|
| [server.tsx](../src/server.tsx) | Pipeline: `data()` middleware, `dual()` execution, `depSum()`, `canSkip()`, `optimized`, `seal()`, `deliver()`, auto-emit, SSE |
| [app.tsx](../src/app.tsx) | Router, `resolve()` async generator, cache client (`Map<key, {value, sum}>`), SSE `connect()`, `seals`, `subscribers` |
| [client.tsx](../src/client.tsx) | Hydration SSR, `action()`, `subscribe()`, `invalidate()` |
| [constants.ts](../src/constants.ts) | Types (`Cached`, `EventState`), `sum()` hash, `links()` parent chain |
| [data/db.ts](../src/data/db.ts) | `TrackerPlugin`, `bump()`, `version()`, `snapshot()`, `tap()`, `unread()` |
| handler.ts | `page()`, `layout()`, `head()`, `deps`, `actions`, `events` — por ruta |

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT REQUEST                     │
│              X-Have: (app)::user=abc,                │
│              (app)::unread=def,page:dashboard=ghi    │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  SERVER (server.tsx)                  │
│                                                      │
│  1. snapshot(eventTables) → req.versions             │
│  2. Parse X-Have → clientHave                        │
│  3. canSkip(): depSum/depSums vs clientHave          │
│     ✅ Match → skip handler, return null             │
│     ❌ Miss  → execute handler                       │
│  4. dual(): handler.ts + page.tsx en paralelo        │
│  5. optimized: omit per-key matches (partial data)   │
│  6. seal(): event sums (skip dirty tables)           │
│  7. Response: { data, sums, es }                     │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  CLIENT (app.tsx)                     │
│                                                      │
│  1. Merge: { ...cached, ...partial } per key         │
│  2. Update cache con sums                            │
│  3. Update seals si es != null                       │
│  4. Proxima nav → X-Have con sums actualizados       │
└─────────────────────────────────────────────────────┘
```

---

## Data Loading

### Exports de handler.ts

| Export | Firma | Runs On | Uso |
|--------|-------|---------|-----|
| `page(req, parent)` | Server | Database, secrets |
| `layout(req, parent)` | Server | Database, secrets (shared) |
| `head(req, parent)` | Server | SEO dinamico |
| `deps` | `string[] \| Record<string, string[]>` | Cache + auto-emit |
| `actions` | `Record<string, (req, res) => Promise>` | Form actions |
| `events` | `Record<string, (req) => Promise>` | SSE events |

`page.tsx` y `layout.tsx` tambien exportan `handler(ctx, parent)` y `head(ctx, parent)` que corren en **ambos** lados (server + client). Merge order: `{ ...serverData, ...clientData }` — client wins.

### Dual execution

```ts
async function dual(serverFn, clientFn, isAjax) {
  if (isAjax) return { server: await serverFn(), merged: server }
  const [server, client] = await Promise.all([serverFn(), clientFn()])
  return { server, merged: { ...server, ...client } }
}
```

- **SSR:** ambos en paralelo, client wins en merge
- **Client nav (AJAX):** solo server (client ya bundled)

### Parent chain

`await parent()` retorna datos acumulados de ancestros. Deferred promises permiten ejecucion en paralelo:

```
Depth 0 (root layout):   parent() → {}
Depth 1 (app layout):    parent() → { ...depth0 }
Depth 2 (page):          parent() → { ...depth0, ...depth1 }
```

Todos los handlers ejecutan en paralelo via `Promise.all([layoutTasks, pageTask])`. Cada `parent()` espera solo ancestros, no descendientes.

---

## Cache

### depSum — sum basado en deps

```ts
const depSum = (deps, userId?, key?) => {
  const { tables, user, ttl } = parseDeps(deps)
  return sum({
    v: snapshot(tables),                              // { users: 42, posts: 15 }
    u: user ? userId : undefined,                     // :user → incluir userId
    t: ttl ? Math.floor(Date.now() / ttl) : undefined // :ttl:60000 → bucket temporal
  })
}
```

Deps especiales:
- `:user` — incluye userId en el sum (cache per-user, evita leaks)
- `:ttl:N` — incluye bucket temporal (expiracion por tiempo)

### TrackerPlugin — auto-bump

```ts
class TrackerPlugin implements KyselyPlugin {
  transformQuery(args) {
    if (INSERT || UPDATE || DELETE) bump(table)
  }
}
```

Cada write a la DB incrementa la version de la tabla automaticamente. Sin invalidacion manual.

### canSkip — skip optimization

```ts
const canSkip = (handler, key) => {
  if (keyed(handler.deps)) {
    const s = depSums(handler.deps, userId)
    return Object.entries(s).every(([k, v]) => clientHave[`${key}::${k}`] === v) && s
  }
  const s = depSum(handler.deps, userId)
  return s !== null && clientHave[key] === s && s
}
```

Retorna los sums directamente (o `false`). Evita doble computacion.

Si match → handler no ejecuta, 0 queries a DB. El client usa valor cacheado.

### optimized — partial response

Para per-key deps, itera keys y omite las que matchean:

```ts
const optimized = unified.map((item, i) => {
  if (typeof s === 'object') {
    const partial = {}
    for (const [k, v] of Object.entries(s))
      if (clientHave[`${keys[i]}::${k}`] !== v) partial[k] = item[k]
    return Object.keys(partial).length ? partial : null
  }
  return clientHave[keys[i]] === s ? null : item
})
```

---

## Per-key deps

### Concepto

`deps` acepta `Record<string, string[]>`. Cada key mapea a una key del return del handler. El framework computa sums por key, compara por key, y transmite solo lo que cambio.

```ts
// Handler-level — single concern
export const deps = ['sessions', ':user']
export async function page(req) { return { sessions: [...] } }

// Key-level — multi concern
export const deps = {
  user: ['users', 'members', ':user'],
  unread: ['messages', 'participants', ':user'],
}
export async function layout(req) {
  return { user: { ...user, roles }, unread: count }
}
```

Si cambia `messages`, solo `unread` viaja. `user` se mantiene del cache.

### Handlers migrados

| Handler | deps | Beneficio |
|---------|------|-----------|
| `(app)` | `{ user: ['users','members',':user'], unread: ['messages','participants',':user'] }` | ALTO — cada mensaje solo envia un number |
| `(app)/dashboard` | `{ user: ['users','members',':user'], stats: ['sessions','tokens','participants','messages',':user'], recentSessions: ['sessions',':user'] }` | MEDIO — separa user de stats |
| `(app)/account/chats` | `{ chats: ['chats','participants','messages',':user'], users: ['users'] }` | BAJO — limpia |
| `(app)/admin` | `['users','sessions','tokens']` | Fix — faltaba deps |

### Wire format

**X-Have header:**
```
# Array deps:
page:(app)/dashboard=abc

# Per-key deps:
(app)::user=abc,(app)::unread=def
```

Separador `::` — no aparece en paths (`/`) ni en sums (base36).

**Response:**
```ts
// sums per-key:
sums[i] = { user: "abc", unread: "def" }

// data parcial (solo lo que cambio):
data[i] = { unread: 5 }      // user omitido, client mergea con cache
data[i] = null                // nada cambio, handler skipped
```

**Client merge:**
```ts
raw.forEach((item, i) => {
  if (typeof sums[i] === 'object') {
    const existing = cache.get(keys[i])?.value ?? {}
    cache.set(keys[i], { value: { ...existing, ...item }, sum: sums[i] })
  } else if (sums[i]) {
    cache.set(keys[i], { value: item, sum: sums[i] })
  }
})
```

### Helpers

```ts
const keyed = (deps) => !!deps && !Array.isArray(deps)

const depSums = (deps: Record<string, string[]>, userId?, key?) => {
  const result = {}
  for (const [k, d] of Object.entries(deps)) {
    const s = depSum(d, userId, key)
    if (s) result[k] = s
  }
  return result
}

const tables = (deps) => {
  if (Array.isArray(deps)) return deps.filter(d => !d.startsWith(':'))
  return [...new Set(Object.values(deps).flat().filter(d => !d.startsWith(':')))]
}
```

---

## Events (SSE)

Contraparte de Actions (client → server). Eventos fluyen server → client via SSE.

| Aspecto | Actions | Events |
|---------|---------|--------|
| Direccion | Client → Server | Server → Client |
| Transporte | HTTP POST | SSE |
| Definicion | `export const actions = {}` | `export const events = {}` |
| Invocacion server | — | `emit(name, params?)` |
| Helper cliente | `action(name)` | `subscribe(name, callback)` |

### Auto-emit

Mecanismo por defecto. Cuando un handler exporta `deps` y `events`, escrituras a las tablas en `deps` disparan los eventos automaticamente.

```ts
// binds: tabla → eventos que dependen de ella
const binds = new Map<string, Set<string>>()
for (const [, handler] of handlers) if (handler.events && handler.deps) {
  for (const table of tables(handler.deps))
    for (const name of Object.keys(handler.events)) binds.get(table)!.add(name)
}

// tap: bump() → hook → queue pending → microtask → emit()
tap(table => {
  if (delivering > 0) { deferred.add(table); return }
  const names = binds.get(table)
  if (!names) return
  if (!pending.size) queueMicrotask(() => {
    pending.forEach(name => emit(name))
    pending.clear()
  })
  names.forEach(name => pending.add(name))
})
```

**Capacitor pattern:** acumula escrituras sincronas y despacha en un solo batch via `queueMicrotask`. Multiples writes en una accion = un solo emit por evento.

### Manual emit — solo para filtrado por params

Auto-emit no conoce parametros de ruta. Usar `emit(name, params)` solo cuando se necesita filtrar:

```ts
emit('messages', { id: '5' })  // solo clientes viendo chat 5
```

`emit()` absorbe auto-emit pendiente: `pending.delete(name)` antes de disparar.

### deliver() — ejecucion de eventos

```ts
const deliver = async (client, reg) => {
  delivering++
  try {
    const data = await reg.handler(request)
    // Computa sums per-key o handler-level
    // Envia: { event, data, error, sum, nav }
  } finally {
    delivering--
    if (delivering === 0) {
      if (deferred.size && depth < 2) { depth++; flush() }
      else { depth = 0; deferred.clear() }
    }
  }
}
```

### Seals — event sums para SSE skip

`Map<name, string | Record<string, string>>` en el cliente. Persisten entre navegaciones.

**Flujo:**
1. SSR/Ajax → response incluye `es: seal(path, userId, versions)`
2. Client guarda: `seals.set(name, sum)`
3. SSE connect URL: `?es=status::user:abc,status::unread:def`
4. Server compara → match → skip (0 queries)

**Dirty seal detection:** `seal()` recibe `req.versions` (snapshot pre-handlers). Si una tabla cambio durante el request (side effect del page handler), ese evento se excluye del seal. El cliente no tendra seal → SSE lo entrega on-connect.

```ts
const seal = (path, userId, before?) => {
  for (const reg of registrations) {
    // Skip events cuyas deps cambiaron durante este request
    if (before && reg.deps && tables(reg.deps).some(t => version(t) !== (before[t] ?? 0))) continue
    // ... compute sums ...
  }
}
```

### SSE-on-connect

Al conectar SSE, el server ejecuta todos los event handlers que matchean la ruta. Pero primero compara seals — si el cliente ya tiene data fresca, skipea.

```ts
for (const reg of registrations) {
  if (keyed(reg.deps)) {
    const s = depSums(reg.deps, userId, reg.key)
    if (Object.entries(s).every(([k, v]) => known[`${reg.name}::${k}`] === v)) continue
  } else {
    const s = depSum(reg.deps, userId, reg.key)
    if (s && known[reg.name] === s) continue
  }
  deliver(client, reg)
}
```

### Nav cache sync via SSE

Cada mensaje SSE incluye `nav: { key, sum }`. El cliente actualiza su navigation cache:

```ts
sse.source.onmessage = (e) => {
  const { event, data, error, sum, nav } = JSON.parse(e.data)
  if (sum) seals.set(event, sum)
  if (nav && data) {
    // Per-key: merge con existente. Handler-level: reemplazar.
    const existing = typeof nav.sum === 'object' ? cache.get(nav.key)?.value : undefined
    cache.set(nav.key, { value: existing ? { ...existing, ...data } : data, sum: nav.sum })
  }
  subscribers.get(event)?.forEach(fn => fn({ data, error }))
}
```

Re-navegar → `X-Have` envia sums actualizados por SSE → server ve match → skip → 0 bytes.

### subscribe() — helper cliente

```ts
export function subscribe<T>(name: string, callback: EventCallback<T>) {
  const component = current()
  const wrapped = (state) => { callback(state); component.next() }
  subscribers.get(name)!.add(wrapped)
}
```

Uso en componente stateful:

```tsx
const Layout: Stateful<LayoutArgs<Data>> = function* (args) {
  let user = args.data?.user
  let unread = args.data?.unread ?? 0

  subscribe<Data>('status', ({ data }) => {
    user = data!.user
    unread = data!.unread
  })

  while (true) {
    yield <Nav user={user} unread={unread} />
  }
}
```

**Pitfall:** No sobrescribir estado SSE con `args.data` dentro de `while(true)`. Inicializar antes del loop.

### Layout-level events

Eventos en layout handlers (ultimo segmento es grupo) matchean todos los subpaths:

| Handler | Pattern | Matchea |
|---------|---------|---------|
| `(app)/handler.ts` | `/*` | Todo |
| `account/chats/handler.ts` | `/account/chats` | Solo exacto |
| `account/chats/[id]/handler.ts` | `/account/chats/:id` | Solo con `:id` |

---

## Protecciones contra loops

### 1. Navegacion concurrente — generation counter

```ts
let generation = 0
const go = async (page) => {
  const gen = ++generation
  for await (const state of resolve(...)) {
    if (gen !== generation) return  // stale, bail
  }
  if (gen !== generation) return  // stale, skip SSE
}
```

Cada `go()` incrementa generation. Si otro empezo, el viejo se abandona.

### 2. Cascada auto-emit — delivering guard + deferred flush

Bumps durante delivery se difieren. Cuando todas las deliveries completan, se dispara un round de correccion:

```ts
tap(table => {
  if (delivering > 0) { deferred.add(table); return }
  // ... normal auto-emit ...
})

// En deliver() finally:
delivering--
if (delivering === 0) {
  if (deferred.size && depth < 2) { depth++; flush() }
  else { depth = 0; deferred.clear() }
}
```

**Ejemplo:** `messages` event marca `seen` → bumps `participants` → deferred. Todas las deliveries completan → flush → `status` re-fires con `unread: 0` correcto.

`depth < 2` previene loops infinitos (max 2 rounds de correccion).

### 3. Doble emit — absorcion

```ts
export const emit = (name, params?) => {
  pending.delete(name)  // absorbe auto-emit pendiente
  bus.get(name)?.forEach(fn => fn(params ?? {}))
}
```

Manual emit tiene prioridad (filtra por params). Una sola delivery.

### 4. Dirty seal — snapshot pre-handlers

```ts
req.versions = snapshot(eventTables)  // ANTES de correr handlers
// ... handlers ejecutan, posibles side-effect writes ...
seal(path, userId, req.versions)  // compara: si tabla cambio, excluye evento
```

Previene: seal fresco + data stale → SSE skip incorrecto.

### 5. SSE max retries

```ts
if (++sse.retries > 10) return  // stop after ~2min with backoff
```

Reset en `onopen`. Proxima navegacion reconecta fresh.

---

## Seguridad

| Aspecto | Implementacion |
|---------|---------------|
| **Auth SSE** | Wares de ruta protegen pagina Y SSE (misma URL, `Accept` header distingue) |
| **Limites** | Max 5 SSE por usuario (`SSE_MAX_PER_USER`), responde 429 |
| **Heartbeat** | 30s, detecta conexiones zombie |
| **Backoff** | Exponencial 1s→30s + jitter, previene thundering herd |
| **CSRF** | SSE usa GET — CORS del browser protege. Actions usan doble-submit CSRF |
| **Errores** | Errores en event handlers no afectan otros clientes |

---

## Comparacion con frameworks

### Feature comparison

| Feature | ajo-kit | SvelteKit | Next.js 15 | Remix | Nuxt 4 | SolidStart | TanStack |
|---------|---------|-----------|------------|-------|--------|-----------|----------|
| **Auto invalidacion** | ✅ DB writes | ❌ Manual | ❌ Manual | ⚠️ Actions | ❌ Manual | ⚠️ Actions | ❌ Manual |
| **Cache granular** | ✅ Table + user + per-key | ⚠️ URL | ⚠️ Tags | ❌ | ⚠️ Key | ⚠️ Cache key | ✅ loaderDeps |
| **Skip handlers** | ✅ Sum comparison | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ staleTime |
| **Cache per-user** | ✅ :user dep | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Expiracion temporal** | ✅ :ttl dep | ⚠️ | ✅ revalidate | ⚠️ | ❌ | ❌ | ✅ staleTime |
| **Single request** | ✅ Todo en 1 | ❌ Per load fn | ⚠️ RSC | ✅ | ⚠️ | ⚠️ | ⚠️ |
| **Parent data** | ✅ await parent() | ✅ data param | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SSE auto-emit** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SSE nav cache sync** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Streaming** | ❌ | ✅ | ✅ | ✅ defer | ❌ | ✅ | ✅ |
| **Preloading** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ hover | ✅ hover |
| **Optimistic UI** | ❌ | ❌ | ⚠️ | ❌ | ❌ | ✅ | ✅ |

### Innovaciones unicas

1. **TrackerPlugin** — auto-bump de versiones en writes, zero invalidacion manual
2. **Per-key deps** — granularidad sub-handler. Ningun framework tiene esto.
3. **depSum skip** — handler no ejecuta si sums matchean. Zero queries a DB.
4. **Dirty seal** — detecta side effects durante el request, fuerza re-delivery via SSE
5. **Deferred flush** — corrige datos stale cuando event handlers tienen side effects
6. **Nav cache sync** — SSE actualiza cache de navegacion, evita re-fetches

### Mejores casos de uso

| Framework | Mejor para |
|-----------|-----------|
| **ajo-kit** | Apps DB-centric, dashboards, admin panels, real-time |
| **SvelteKit** | Performance, minimal JS, sitios publicos |
| **Next.js** | Enterprise, SEO, ecosistema Vercel |
| **Remix** | Web standards, forms, progressive enhancement |
| **Nuxt** | Ecosistema Vue, SSR apps |
| **SolidStart** | Fine-grained reactivity, SPAs |
| **TanStack** | Type safety, React Query users |

---

## Anti-patrones

- Secrets en `page.tsx`/`layout.tsx` handler() (leaks al client)
- `args.loading` sin export `defer` (siempre false)
- Falta `NotFoundError` para 404s
- Context fuera del generator loop
- Patterns de React (`useState`, `className`, `onClick`)
- Falta `await parent()` en handlers dependientes
- Falta `deps` en handler cacheable (re-fetch innecesario cada nav)
- `emit()` manual para broadcast events (auto-emit lo maneja via deps)
- Falta `deps` en handler con `events` (auto-emit no funciona)
- Sobrescribir estado SSE con `args.data` dentro de `while(true)`
- Event handler que escribe a tabla en sus propios deps sin proteccion (ver delivering guard)

---

## Mejoras futuras

| Mejora | Concepto |
|--------|----------|
| **Streaming** | `export const defer = ['key']` — shell inmediato, data critica primero |
| **Preloading** | `<Link prefetch="hover">` — fetch on hover, navegacion instantanea |
| **Optimistic UI** | `action('delete', { optimistic: (prev, input) => ... })` — revert on error |
| **Persistent cache** | `export const persist = true` — localStorage, loads instantaneos en revisit |
| **Cross-route tags** | `invalidate({ tag: 'content' })` — invalidar multiples rutas |
| **Redis adapter** | Versiones en Redis para horizontal scaling (actualmente in-memory, single process) |
