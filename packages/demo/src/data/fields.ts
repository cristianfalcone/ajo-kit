import {
	pipe,
	object,
	string,
	trim,
	toLowerCase,
	email as vemail,
	minLength,
	maxLength,
	forward,
	partialCheck,
	type GenericSchema,
} from 'ajo-kit/validate'

export const email = pipe(
	string(),
	trim(),
	toLowerCase(),
	maxLength(254, 'Invalid email'),
	vemail('Invalid email')
)

export const password = pipe(
	string(),
	minLength(8, 'Password must be at least 8 characters')
)

export const trimmed = pipe(string(), trim())

/** A form's entries plus a new password and its confirmation, which must match. */
export const confirmed = <T extends Record<string, GenericSchema>>(entries: T) => {
	const form = object({ ...entries, password, confirm: string() })
	// Valibot cannot resolve field paths on a generic object, so the check is typed on the two fields it reads.
	const matching = forward(
		partialCheck(
			[['password'], ['confirm']],
			(input: { password: string; confirm: string }) => input.password === input.confirm,
			'Passwords must match'
		),
		['confirm']
	)

	return pipe(form, matching as never) as typeof form
}
