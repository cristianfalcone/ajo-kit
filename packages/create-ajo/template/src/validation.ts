import { email, maxLength, minLength, pipe, string, toLowerCase, trim } from 'ajo-kit/validate'

export const address = pipe(string(), trim(), toLowerCase(), email('Enter a valid email'), maxLength(254))
export const password = pipe(string(), minLength(12, 'Use at least 12 characters'), maxLength(128))
export const text = pipe(string(), trim(), minLength(1, 'Write a note'), maxLength(160, 'Use at most 160 characters'))
