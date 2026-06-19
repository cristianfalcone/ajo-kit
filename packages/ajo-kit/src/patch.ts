export type Patch = {
	op: 'replace'
	path: '/'
	value: any
}

export const replacePatch = (value: any): Patch[] => [
	{ op: 'replace', path: '/', value },
]

export function applyPatch(obj: any, patches: Patch[]) {
	const patch = patches.at(-1)

	if (!patch) return

	const { value } = patch

	if (Array.isArray(obj) && Array.isArray(value)) {
		obj.length = 0
		obj.push(...value)
		return
	}

	Object.keys(obj).forEach(key => delete obj[key])
	Object.assign(obj, value)
}
