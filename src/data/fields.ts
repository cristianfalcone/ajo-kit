import {
	pipe,
	string,
	trim,
	toLowerCase,
	email as vemail,
	minLength,
} from 'valibot'

export const email = pipe(
	string(),
	trim(),
	toLowerCase(),
	vemail('Invalid email')
)

export const password = pipe(
	string(),
	minLength(8, 'Password must be at least 8 characters')
)

export const username = pipe(
	string(),
	trim(),
	minLength(1, 'Username required')
)

export const trimmed = pipe(string(), trim())
