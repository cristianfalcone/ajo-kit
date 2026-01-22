import * as v from 'valibot'

export const email = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.email('Invalid email')
)

export const password = v.pipe(
	v.string(),
	v.minLength(8, 'Password must be at least 8 characters')
)

export const username = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Username required')
)

export const trimmed = v.pipe(v.string(), v.trim())

export const body = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Comment cannot be empty'),
	v.maxLength(1000, 'Comment is too long')
)
