/** Ability string used by account grants and bearer API tokens. */
export type Ability = string

const full = '*'
const wildcarded = (ability: Ability) => ability === full
	? null
	: ability.endsWith(':*')
		? ability.slice(0, -2)
		: null

/** Returns true when grants include the required ability. */
export function can(grants: Ability[], required: Ability): boolean {

	if (grants.includes(full)) return true
	if (grants.includes(required)) return true

	const [resource] = required.split(':')

	return grants.includes(`${resource}:*`)
}

/** Returns true when grants include every required ability. */
export const all = (grants: Ability[], required: Ability[]) =>
	required.every(ability => can(grants, ability))

/** Removes duplicate and redundant grants while preserving stable order. */
export function compact(grants: Ability[]): Ability[] {

	const unique = [...new Set(grants)]

	if (unique.includes(full)) return [full]

	const resources = new Set(unique.map(wildcarded).filter(resource => resource !== null))

	return unique.filter(grant => {
		const resource = wildcarded(grant)
		if (resource) return true

		return !resources.has(grant.split(':')[0])
	})
}

/** Merges ability grant sets with duplicate and wildcard compaction. */
export const merge = (...sets: Ability[][]): Ability[] =>
	compact(sets.flat())

/** Returns the effective grants allowed by both grant sets. */
export function intersect(left: Ability[], right: Ability[]): Ability[] {

	const grants: Ability[] = []

	for (const a of compact(left)) {
		for (const b of compact(right)) {
			const grant = overlap(a, b)
			if (grant) grants.push(grant)
		}
	}

	return compact(grants)
}

function overlap(left: Ability, right: Ability): Ability | null {

	if (left === full) return right
	if (right === full) return left
	if (left === right) return left

	const l = wildcarded(left)
	const r = wildcarded(right)

	if (l && r) return l === r ? left : null
	if (l && can([left], right)) return right
	if (r && can([right], left)) return left

	return null
}
