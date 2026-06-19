export type Patch = {
	op: 'replace'
	path: '/'
	value: any
}

export const replacePatch = (value: any): Patch[] => [
	{ op: 'replace', path: '/', value },
]
