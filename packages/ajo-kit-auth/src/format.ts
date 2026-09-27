/** The ISO 8601 form every auth table stores and compares times in. */
export const stamp = (at = Date.now()) => new Date(at).toISOString()

/** The form an email is stored, invited and signed in. */
export const normalize = (email: string) => email.trim().toLowerCase()
