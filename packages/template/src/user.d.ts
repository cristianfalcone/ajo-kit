import type { User as Account } from 'ajo-kit-auth'

declare module 'ajo-kit' {
	interface User extends Pick<Account, 'name' | 'email' | 'verified'> {}
}
