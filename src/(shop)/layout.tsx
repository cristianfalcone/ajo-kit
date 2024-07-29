import { Children, Component } from 'ajo'

type LayoutProps = {
  children: Children
}

export default (props: LayoutProps) =>
  <>
    <div class="bg-green-600 p-4 text-white text-2xl flex justify-between">
      Shop Layout
      <Counter />
    </div>
    {props.children}
  </>

const Counter: Component = function* () {

	let count = 0

	const increment = () => {
		count++
		this.render()
	}

	while (true) yield (
		<button
      type="button"
      set:onclick={increment}
      class="whitespace-nowrap rounded-lg bg-gray-700 px-3 py-1 text-sm font-medium tabular-nums text-gray-100 hover:bg-gray-500 hover:text-white"
    >
      {count}
    </button>
	)
}
