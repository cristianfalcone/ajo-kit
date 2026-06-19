export type Patch =
	| { op: 'replace'; path: string; value: any }
	| { op: 'add'; path: string; value: any }
	| { op: 'remove'; path: string }

const pointerKey = (key: string) => key.replace(/~1/g, '/').replace(/~0/g, '~')

export const replacePatch = (value: any): Patch[] => [
	{ op: 'replace', path: '/', value },
]

export function applyPatch(obj: any, patches: Patch[]) {
	for (const patch of patches) {
		const { op, path } = patch

		if (path === '/') {

			if (op === 'remove') continue

			if (Array.isArray(obj) && Array.isArray(patch.value)) {
				obj.length = 0
				obj.push(...patch.value)
			} else {
				Object.keys(obj).forEach(k => delete obj[k])
				Object.assign(obj, patch.value)
			}

			continue
		}

		const keys = path.split('/').slice(1).map(pointerKey)
		const last = keys.pop()!

		let target = obj

		for (const key of keys) target = target[key]

		if (op === 'replace') {

			target[last] = patch.value

		} else if (op === 'add') {

			if (Array.isArray(target)) {
				if (last === '-') target.push(patch.value)
				else target.splice(Number(last), 0, patch.value)
			} else {
				target[last] = patch.value
			}

		} else if (op === 'remove') {

			if (Array.isArray(target)) target.splice(Number(last), 1)
			else delete target[last]
		}
	}
}
