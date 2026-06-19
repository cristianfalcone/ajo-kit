const pointerKey = (key: string) => key.replace(/~1/g, '/').replace(/~0/g, '~')

export function applyPatch(obj: any, patches: any[]) {
	for (const { op, path, value } of patches) {

		if (path === '/') {

			if (Array.isArray(obj) && Array.isArray(value)) {
				obj.length = 0
				obj.push(...value)
			} else {
				Object.keys(obj).forEach(k => delete obj[k])
				Object.assign(obj, value)
			}

			continue
		}

		const keys = path.split('/').slice(1).map(pointerKey)
		const last = keys.pop()!

		let target = obj

		for (const key of keys) target = target[key]

		if (op === 'replace') {

			target[last] = value

		} else if (op === 'add') {

			if (Array.isArray(target)) {
				if (last === '-') target.push(value)
				else target.splice(Number(last), 0, value)
			} else {
				target[last] = value
			}

		} else if (op === 'remove') {

			if (Array.isArray(target)) target.splice(Number(last), 1)
			else delete target[last]
		}
	}
}
