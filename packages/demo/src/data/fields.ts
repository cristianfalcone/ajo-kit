import {
	pipe,
	string,
	trim,
	toLowerCase,
	email as vemail,
	minLength,
	maxLength,
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
