import type { VNode } from 'ajo'
import { describe, expect, it } from 'vitest'
import { DrawerContent } from 'ajo-ui-playa/drawer'

const args = (handle: boolean) =>
	DrawerContent({ handle }) as VNode & {
		handleClass?: string
		sideClass?: Record<string, string>
	}

describe('drawer theme handle recipe', () => {
	it('uses the normal horizontal geometry and no self-cancelling visibility classes', () => {
		const plain = args(false)
		const handled = args(true)
		const tokens = handled.handleClass?.split(/\s+/) ?? []

		expect(handled.sideClass?.left).toBe(plain.sideClass?.left)
		expect(handled.sideClass?.right).toBe(plain.sideClass?.right)
		expect(tokens).not.toContain('hidden')
		expect(tokens.some(token => token.includes('/drawer-content:block'))).toBe(false)
	})
})
