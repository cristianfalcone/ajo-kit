import {
	pipe,
	string,
	trim,
	toLowerCase,
	email as vemail,
	minLength,
} from '@kit/validate'

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

export const trimmed = pipe(string(), trim())
