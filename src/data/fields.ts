import {
	pipe,
	string,
	trim,
	toLowerCase,
	email as vemail,
	minLength,
	maxLength,
	transform,
	number,
	integer,
	minValue,
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

export const body = pipe(
	string(),
	trim(),
	minLength(1, 'Comment cannot be empty'),
	maxLength(1000, 'Comment is too long')
)

export const numeric = pipe(
	string(),
	transform(Number),
	number(),
	integer(),
	minValue(1)
)
