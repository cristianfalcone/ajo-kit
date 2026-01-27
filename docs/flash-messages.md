# Flash Messages Implementation Plan

## Problem Statement

Currently, ajo-kit lacks a consistent way to display one-time messages after form actions. This creates UX issues when:

1. **Creating tokens**: Need to show the full token once while updating the masked list
2. **Form submissions**: Success/error messages disappear on navigation
3. **Multi-step flows**: No way to carry messages between redirects

**Current workaround:** Manual "Copy and close" button that requires user action to update UI.

---

## Solution: Cookie-Based Flash Messages

Implement a **SvelteKit-inspired** flash message system using cookies with auto-cleanup.

### Design Principles

- ✅ **Simple**: 3 functions (`read`, `write`, `clear`)
- ✅ **Elegant**: Auto-cleanup, no DB changes
- ✅ **DRY**: Single implementation for entire app
- ✅ **Performant**: Stateless, no additional queries
- ✅ **Feature Parity**: Aligns with SvelteKit's flash pattern

### Why Cookies Over Session Storage?

| Aspect | Cookies | Session DB |
|--------|---------|------------|
| **Complexity** | Low (20 lines) | High (migration, queries) |
| **Performance** | No DB queries | 2 queries per flash |
| **Scalability** | Stateless | Requires session cleanup |
| **Implementation** | 1 hour | 4-6 hours |

**Trade-off:** Cookies are client-readable (4KB limit) but sufficient for 95% of use cases.

---

## Implementation

### 1. Core Module: `/src/auth/flash.ts`

```typescript
import type { Request, Response } from 'polka'

export type FlashType = 'success' | 'error' | 'warning' | 'info'

export interface FlashMessage {
	type: FlashType
	message: string
}

const COOKIE_NAME = 'flash'
const MAX_AGE = 120 // 2 minutes (enough for redirect)
const OPTIONS = 'SameSite=Lax; Path=/'

/**
 * Read flash message from request cookie.
 * Returns null if no flash exists or cookie is malformed.
 */
export function read(req: Request): FlashMessage | null {
	const cookie = req.headers.cookie
	if (!cookie) return null

	const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
	if (!match) return null

	try {
		return JSON.parse(decodeURIComponent(match[1]))
	} catch {
		return null
	}
}

/**
 * Write flash message to response cookie.
 * Cookie will auto-expire after 2 minutes.
 */
export function write(res: Response, flash: FlashMessage): void {
	const value = encodeURIComponent(JSON.stringify(flash))
	res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; ${OPTIONS}; Max-Age=${MAX_AGE}`)
}

/**
 * Clear flash message cookie immediately.
 * Used after displaying message to prevent re-showing.
 */
export function clear(res: Response): void {
	res.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${OPTIONS}; Max-Age=0`)
}
```

**Security Notes:**
- Cookie is client-readable (no `httpOnly`) - **don't store secrets**
- `SameSite=Lax` prevents CSRF attacks
- 2-minute TTL prevents stale messages
- URL-encode prevents injection attacks

---

### 2. Middleware Integration: `/src/server.tsx`

**Add flash handling to data pipeline:**

```typescript
import { read as flashRead, clear as flashClear } from '/src/auth/flash'

// In data middleware (after session, before handlers)
const flash = flashRead(req)
if (flash) {
	flashClear(res) // Auto-cleanup after reading
	req.flash = flash
}
```

**Location:** Right after CSRF check, before `for (let route of routes)` loop.

---

### 3. Type Extensions: `/src/constants.ts`

```typescript
import type { FlashMessage } from '/src/auth/flash'

// Extend State interface
export interface State {
	url: string
	params: Params
	data: Data
	loading: boolean
	error?: AppError
	head?: Head
	flash?: FlashMessage // NEW
}

// Extend Polka Request
declare module 'polka' {
	interface Request {
		user?: User
		token?: { abilities: string[] }
		action?: Action
		data?: (Head | Entry | null)[]
		sums?: string[]
		versions?: Record<string, number>
		flash?: FlashMessage // NEW
	}
}

// Add to PageArgs and LayoutArgs
export interface PageArgs<T = unknown> {
	url: string
	params: Params
	data: T
	loading: boolean
	error?: AppError
	flash?: FlashMessage // NEW
}

export interface LayoutArgs {
	url: string
	params: Params
	data: unknown
	loading: boolean
	error?: AppError
	flash?: FlashMessage // NEW
	children: any
}
```

---

### 4. Display Component: Root Layout

**Option A: Global banner in `/src/(app)/layout.tsx`**

```tsx
import type { Stateful } from 'ajo'
import type { LayoutArgs } from '/src/constants'

const Layout: Stateful<LayoutArgs> = function* (args) {
	while (true) {
		yield (
			<div>
				{args.flash && (
					<div class={`flash flash-${args.flash.type}`}>
						<span class="flash-message">{args.flash.message}</span>
					</div>
				)}
				{args.children}
			</div>
		)
	}
}

export default Layout
```

**CSS (in existing styles):**

```css
.flash {
	position: fixed;
	top: 1rem;
	right: 1rem;
	padding: 1rem 1.5rem;
	border-radius: 0.5rem;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	z-index: 9999;
	animation: slideIn 0.3s ease-out;
}

.flash-success {
	background: rgb(220 252 231);
	border: 1px solid rgb(187 247 208);
	color: rgb(22 101 52);
}

.flash-error {
	background: rgb(254 226 226);
	border: 1px solid rgb(252 165 165);
	color: rgb(153 27 27);
}

@keyframes slideIn {
	from { transform: translateX(100%); }
	to { transform: translateX(0); }
}
```

**Option B: Per-page control**

Let pages decide where to show flash (more flexible but less DRY).

---

### 5. Usage in Handlers

**Example 1: Success message with redirect**

```typescript
// src/(public)/login/handler.ts
import { write as flashWrite } from '/src/auth/flash'

export async function authenticate(req: Request, res: Response) {
	// ... validation ...

	write(res, token, input.remember)

	// Flash success message
	flashWrite(res, {
		type: 'success',
		message: 'Welcome back!'
	})

	return { redirect: '/dashboard' }
}
```

**Example 2: Error without redirect**

```typescript
// src/(public)/register/handler.ts
import { write as flashWrite } from '/src/auth/flash'

export async function signup(req: Request, res: Response) {
	const exists = await db()
		.selectFrom('users')
		.select('id')
		.where('email', '=', input.email)
		.executeTakeFirst()

	if (exists) {
		// Flash error and stay on page
		flashWrite(res, {
			type: 'error',
			message: 'Email already registered'
		})
		return // No redirect
	}

	// ... create user ...
}
```

**Example 3: Multiple actions (token creation)**

```typescript
// src/(app)/settings/tokens/handler.ts
import { write as flashWrite } from '/src/auth/flash'

export async function make(req: Request) {
	const plain = await create(req.user!.id, input.name, input.abilities)

	// Flash with token (shown once)
	flashWrite(req, {
		type: 'success',
		message: `Token created: ${plain}`
	})

	return { redirect: '/settings/tokens' }
}
```

**Note:** For tokens, flash can contain the full token. It will only be shown once and auto-expires in 2 minutes.

---

## Migration Strategy

### Phase 1: Core Implementation (1 hour)

1. ✅ Create `/src/auth/flash.ts`
2. ✅ Add middleware in `/src/server.tsx`
3. ✅ Extend types in `/src/constants.ts`
4. ✅ Add display component in root layout

### Phase 2: Update Existing Handlers (2 hours)

1. **Login** - "Welcome back!"
2. **Register** - "Account created!"
3. **Logout** - "Logged out successfully"
4. **Password Reset** - "Password updated"
5. **Email Verification** - "Email verified"
6. **Token Creation** - Show full token once
7. **Token Revocation** - "Token revoked"

### Phase 3: Testing (1 hour)

- [ ] Test flash persists through redirect
- [ ] Test flash disappears after display
- [ ] Test flash expires after 2 minutes
- [ ] Test multiple consecutive actions
- [ ] Test with disabled JavaScript (graceful degradation)

### Phase 4: Documentation (30 minutes)

- [ ] Update `CLAUDE.md` with flash pattern
- [ ] Add examples to `docs/LLMs.md`

**Total Estimated Time:** 4.5 hours

---

## Comparison with Alternatives

### vs. SvelteKit's `sveltekit-flash-message`

| Feature | Ajo-kit | SvelteKit |
|---------|---------|-----------|
| **Storage** | Cookie | Cookie |
| **Auto-cleanup** | ✅ | ✅ |
| **TTL** | 120s | 120s (default) |
| **API** | `read/write/clear` | `setFlash/getFlash` |
| **Lines of code** | ~30 | 500+ (package) |
| **Dependencies** | 0 | 1 package |

**Advantage:** Zero dependencies, simpler API, same functionality.

### vs. Remix's `session.flash()`

| Feature | Ajo-kit | Remix |
|---------|---------|-------|
| **Storage** | Cookie | Session (any) |
| **Security** | Client-readable | Server-only |
| **Queries** | 0 | 2 per flash |
| **Complexity** | Low | Medium |

**Trade-off:** Remix is more secure but requires DB queries and session management.

### vs. Laravel's `session()->flash()`

| Feature | Ajo-kit | Laravel |
|---------|---------|---------|
| **Storage** | Cookie | Session |
| **API** | Similar | Similar |
| **Auto-cleanup** | ✅ | ✅ |

**Similarity:** Nearly identical developer experience.

---

## Advanced Patterns

### Pattern 1: Multiple Message Types

```typescript
// Handler
flashWrite(res, { type: 'success', message: 'Post created' })
flashWrite(res, { type: 'warning', message: 'Image not optimized' })
```

**Problem:** Second write overwrites first.

**Solution:** Use array or complex object (future enhancement).

### Pattern 2: Flash with Redirect Helper

```typescript
// Helper in /src/constants.ts
export function redirect(
	path: string,
	flash?: FlashMessage
): { redirect: string; flash?: FlashMessage } {
	return { redirect: path, flash }
}

// Usage
return redirect('/dashboard', {
	type: 'success',
	message: 'Welcome!'
})
```

Then middleware extracts and writes flash automatically.

### Pattern 3: Toast Notifications

For richer UX, flash can trigger client-side toasts:

```typescript
// In client.tsx
if (window.__state.flash) {
	showToast(window.__state.flash.type, window.__state.flash.message)
}
```

---

## Security Considerations

### What NOT to Store in Flash

❌ Passwords or tokens (use secure response instead)
❌ Sensitive user data (PII)
❌ Large payloads (>1KB)

### What's Safe

✅ Success/error messages
✅ Validation errors
✅ One-time display data (like API tokens in `/settings/tokens`)
✅ Navigation hints

### OWASP Compliance

- ✅ **XSS Prevention**: Auto-escaped in JSX
- ✅ **CSRF Protection**: `SameSite=Lax`
- ✅ **Secure Flag**: Add `Secure` in production (HTTPS)
- ✅ **TTL**: Short expiration (120s)

---

## Future Enhancements

### 1. Flash Queue (Multiple Messages)

```typescript
export interface FlashQueue {
	messages: FlashMessage[]
}

// Write multiple
flashQueue.add(res, { type: 'success', message: 'A' })
flashQueue.add(res, { type: 'warning', message: 'B' })

// Read all
const messages = flashQueue.readAll(req)
```

### 2. Flash Priorities

```typescript
export interface FlashMessage {
	type: FlashType
	message: string
	priority?: 'low' | 'medium' | 'high' // NEW
}
```

### 3. Persistent Flash (Keep)

```typescript
// Keep flash for one more request
flashKeep(res)
```

### 4. Flash with Actions

```typescript
export interface FlashMessage {
	type: FlashType
	message: string
	action?: { label: string; url: string } // NEW
}

// Display
<button onclick={() => navigate(flash.action.url)}>
	{flash.action.label}
</button>
```

---

## Rollback Plan

If flash messages cause issues:

1. Remove middleware from `/src/server.tsx`
2. Revert type changes in `/src/constants.ts`
3. Remove display from layouts
4. Handlers will work without flash (messages just won't show)

**Risk:** Low. Flash is purely additive, doesn't break existing functionality.

---

## Success Metrics

- ✅ Zero manual "refresh" buttons needed
- ✅ All form actions show feedback
- ✅ Token creation shows full token once, then updates list
- ✅ No flash messages persist incorrectly
- ✅ <30 lines of core code

---

## References

- **SvelteKit Flash:** https://github.com/ciscoheat/sveltekit-flash-message
- **Remix Sessions:** https://remix.run/docs/en/main/utils/sessions
- **Laravel Flash:** https://laravel.com/docs/session#flash-data
- **Rails Flash:** https://guides.rubyonrails.org/action_controller_overview.html#the-flash
- **OWASP Cookies:** https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

## Next Steps

1. Review and approve this plan
2. Implement Phase 1 (core)
3. Test with token creation flow
4. Roll out to other handlers
5. Document in `CLAUDE.md`

**Decision Required:** Approve cookie-based implementation or explore session-based alternative?
