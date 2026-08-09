export type Signup = 'open' | 'invite'

export interface MakeUserInput {
	email: string
	password?: string
	name?: string
	role?: 'admin' | 'user'
	verified?: boolean
}

export interface ResetInput {
	user: number
	token: string
	expiry?: string
}

export interface InvitationInput {
	email: string
	name?: string
	token?: string
	expiry?: string
	revoked?: boolean
	accepted?: boolean
}

export type CountQuery =
	| { table: 'users'; where: 'email = ?' | 'email = ? and verified is not null'; value: string }
	| { table: 'sessions' | 'tokens' | 'resets'; where: 'user = ?'; value: number }
	| {
		table: 'invitations'
		where:
			| 'email = ?'
			| 'email = ? and accepted is not null'
			| 'email = ? and revoked is not null'
			| 'email = ? and accepted is null and revoked is null'
		value: string
	}

export interface FixtureMail {
	to: string
	subject: string
	text: string
	html?: string
}

export type FixtureOperation =
	| { op: 'seed' }
	| { op: 'makeUser'; input: MakeUserInput }
	| { op: 'putReset'; input: ResetInput }
	| { op: 'putInvitation'; input: InvitationInput }
	| { op: 'setRegistration'; signup: Signup }
	| { op: 'getRegistration' }
	| { op: 'count'; query: CountQuery }
	| { op: 'verificationPath'; user: number }
	| { op: 'mailClear' }
	| { op: 'mailLast'; to?: string }

const fallback = 'ajo-e2e-only-secret-000000000001'

/** Typed client for the build-only E2E fixture control route. */
export class FixtureClient {
	readonly endpoint: URL

	constructor(baseURL: string, private readonly control = process.env.AJO_E2E_CONTROL ?? fallback) {
		this.endpoint = new URL('/api/__e2e', baseURL)
	}

	private async call<T>(operation: FixtureOperation): Promise<T> {
		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-Ajo-E2E-Control': this.control,
			},
			body: JSON.stringify(operation),
		})
		const body = await response.json().catch(() => null) as {
			message?: string
			error?: { message?: string }
		} | null

		if (!response.ok) {
			const message = body?.error?.message ?? body?.message ??
				`Fixture operation ${operation.op} failed with ${response.status}`
			throw new Error(message)
		}

		return body as unknown as T
	}

	async seed(): Promise<void> {
		await this.call<{ seeded: true }>({ op: 'seed' })
	}

	async makeUser(input: MakeUserInput): Promise<number> {
		return (await this.call<{ user: number }>({ op: 'makeUser', input })).user
	}

	async putReset(input: ResetInput): Promise<string> {
		return (await this.call<{ token: string }>({ op: 'putReset', input })).token
	}

	async putInvitation(input: InvitationInput): Promise<string> {
		return (await this.call<{ token: string }>({ op: 'putInvitation', input })).token
	}

	async setRegistration(signup: Signup): Promise<void> {
		await this.call<{ signup: Signup }>({ op: 'setRegistration', signup })
	}

	async getRegistration(): Promise<Signup> {
		return (await this.call<{ signup: Signup }>({ op: 'getRegistration' })).signup
	}

	async count(query: CountQuery): Promise<number> {
		return (await this.call<{ count: number }>({ op: 'count', query })).count
	}

	async verificationPath(user: number): Promise<string> {
		return (await this.call<{ path: string }>({ op: 'verificationPath', user })).path
	}

	async mailClear(): Promise<number> {
		return (await this.call<{ cleared: number }>({ op: 'mailClear' })).cleared
	}

	async mailLast(to?: string): Promise<FixtureMail | null> {
		return (await this.call<{ mail: FixtureMail | null }>({ op: 'mailLast', ...(to && { to }) })).mail
	}
}
