export function formArrayFields(form: HTMLFormElement): Set<string> {

	const seen = new Set<string>()
	const arrays = new Set<string>()

	for (const element of Array.from(form.elements)) {

		const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		const name = control.name

		if (!name) continue

		if (seen.has(name) || control instanceof HTMLSelectElement && control.multiple) arrays.add(name)
		else seen.add(name)
	}

	return arrays
}

export function formDataBody(
	data: FormData,
	arrayFields: Set<string> = new Set()
): Record<string, string | string[]> {

	const body: Record<string, string | string[]> = {}

	for (const [name, value] of data) {

		if (typeof value !== 'string') continue

		const current = body[name]

		if (current === undefined) body[name] = arrayFields.has(name) ? [value] : value
		else if (Array.isArray(current)) current.push(value)
		else body[name] = [current, value]
	}

	return body
}
