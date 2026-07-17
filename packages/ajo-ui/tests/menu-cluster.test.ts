// @vitest-environment happy-dom
import { describe, expect, test, vi } from 'vitest'
import { cluster, type MenuBranch } from '../src/menu-cluster'

const branch = (content: HTMLElement): MenuBranch => ({
	close: vi.fn(),
	content: () => content,
	prune: vi.fn(),
	trigger: () => null,
})

describe('menu cluster', () => {
	test('opening or highlighting one branch closes only its siblings', () => {
		const tree = cluster()
		const first = branch(document.createElement('div'))
		const second = branch(document.createElement('div'))
		const event = new Event('menu')

		tree.register(first)
		tree.register(second)
		tree.close(event, first)

		expect(first.close).not.toHaveBeenCalled()
		expect(second.close).toHaveBeenCalledWith(event)
	})

	test('pointer dismissal preserves the containing branch and prunes below it', () => {
		const tree = cluster()
		const firstContent = document.createElement('div')
		const target = document.createElement('button')
		firstContent.append(target)
		const first = branch(firstContent)
		const second = branch(document.createElement('div'))
		const event = new Event('pointerdown')

		tree.register(first)
		tree.register(second)
		tree.prune(target, event)

		expect(first.close).not.toHaveBeenCalled()
		expect(first.prune).toHaveBeenCalledWith(target, event)
		expect(second.close).toHaveBeenCalledWith(event)
	})

	test('an unregistered branch leaves the lifecycle immediately', () => {
		const tree = cluster()
		const item = branch(document.createElement('div'))
		const unregister = tree.register(item)

		unregister()
		tree.close()

		expect(item.close).not.toHaveBeenCalled()
	})
})
