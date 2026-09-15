import type { PageArgs } from '@kit'

/** Long route fixtures keep fragment navigation inside the real client router. */
export default ({ params }: PageArgs) => {
	const other = `/__e2e/navigation/${params.page === 'one' ? 'two' : 'one'}`

	return <div style="padding:24px">
		<h1>Navigation {params.page}</h1>
		<nav aria-label="Fragment fixture">
			<a href="#destination">Same document</a>{' · '}
			<a href={`${other}#destination`}>Other document</a>{' · '}
			<a href="#part%3Atwo">Encoded fragment</a>{' · '}
			<a href="#bad%fragment">Literal percent</a>{' · '}
			<a href="#absent">Missing fragment</a>{' · '}
			<a href="#">Top</a>
		</nav>
		<div style="height:1800px" />
		<h2 id="destination" style="scroll-margin-top:32px">Destination</h2>
		<div style="height:1000px" />
		<h2 id="part:two" style="scroll-margin-top:32px">Encoded destination</h2>
		<div style="height:1000px" />
		<h2 id="bad%fragment" style="scroll-margin-top:32px">Literal percent destination</h2>
		<div style="height:1000px" />
		<a href={other}>Other page without fragment</a>
	</div>
}
