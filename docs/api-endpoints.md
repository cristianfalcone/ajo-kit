# API Endpoints and Form Actions

Current `ajo-kit` supports two server mutation styles in the same route `handler.ts`:

1. `actions` for SPA form/navigation flows
2. `default` API handlers for external clients under `/api/*`

## 1. Form Actions (`actions`)

### Server

```ts
// src/(app)/account/profile/handler.ts
export const actions = {
  name: async (req: Request) => {
    const { name } = req.body as { name: string }
    await db().updateTable('users').set({ name }).where('id', '=', req.user!.id).execute()
    emit([`profile:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:users'])
    return { success: true }
  }
}
```

### Client

```tsx
import { action } from '@kit/client'

const form = action<{ success: true }>('name')

<form set:onsubmit={form.submit}>...</form>
```

### How action routing works

`action('name')` posts to the current route using query action syntax:

- request path: `POST /current/route?/name`

If no name is passed, action key `default` is used.

## 2. API Endpoints (`default export`)

### Server

```ts
// src/(app)/tokens/handler.ts
export default {
  async get(req: Request, res: Response) {
    const tokens = await list(req.user!.id)
    send(res, 200, { tokens })
  },

  async post(req: Request, res: Response) {
    const token = await create(req.user!.id, 'API Client', ['*'])
    emit([`tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`, 'admin:tokens', 'admin:stats'])
    send(res, 201, { token })
  }
}
```

Route mapping:

- file route: `src/(app)/tokens/handler.ts`
- API URL: `/api/tokens`

Supported methods: `get`, `post`, `put`, `patch`, `delete`, `options`, `head`.

## 3. Authentication Modes

Both actions and API handlers can use `req.user`.

- Cookie session auth (web)
- Bearer token auth (API/mobile)

Bearer example:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5173/api/tokens
```

## 4. Response Behavior

### For actions

- `Accept: application/json` returns JSON
- Non-AJAX form posts return 302 redirect by default

Return values:

- `{ redirect: '/target' }` -> client navigation redirect
- any object -> serialized JSON payload

### For API handlers

Use `send(res, status, payload)` explicitly.

## 5. Live Data Integration

When actions/API mutate data, emit topics for all readers.

Checklist after a mutation:

1. Which pages/layouts read this data?
2. Which topics do those loaders track?
3. Emit every impacted topic.

If emit coverage is incomplete, some pages will not update live.

## 6. Common Patterns

### Revoke account session

- delete row in `sessions`
- emit: `sessions:<id>`, `dashboard:<id>`, `user:<id>`, `admin:sessions`, `admin:stats`

### Create token

- insert row in `tokens`
- emit: `tokens:<id>`, `dashboard:<id>`, `user:<id>`, `admin:tokens`, `admin:stats`

### Profile update

- update row in `users`
- emit: `profile:<id>`, `dashboard:<id>`, `user:<id>`, `admin:users`

## 7. Validation

Use Valibot via `@kit/validate`:

```ts
import { object, string, parse } from '@kit/validate'

const Schema = object({ name: string() })

const input = parse(Schema, req.body)
```

Validation errors throw `InvalidError` and are surfaced by `action()` as `form.error`.

## 8. Anti-patterns

- Using API handlers for internal SPA forms when actions are simpler
- Forgetting `emit(...)` after mutations
- Returning secrets from publicly reachable endpoints
