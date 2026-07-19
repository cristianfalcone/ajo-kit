import type { Stateful } from 'ajo'

export type WaterArgs = {
	/** Master effect opacity. */
	strength?: number
}

// Fixed square simulation grid, viewport-independent (the canonical size in
// the Evan Wallace / jquery.ripples lineage). The square maps over the
// viewport by its longest side so ripples stay circular.
const SIM = 256

const VERT = 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}'

// The canonical height-field wave kernel: R holds height, G velocity. Pull
// velocity toward the 4-neighbor average (2.0 is the stability limit), damp,
// integrate. CLAMP_TO_EDGE doubles as a soft-reflective boundary.
const UPDATE = `precision highp float;
uniform sampler2D u_field;
uniform vec2 u_texel;
varying vec2 v;
void main(){
	vec4 f=texture2D(u_field,v);
	float avg=(
		texture2D(u_field,v-vec2(u_texel.x,0.)).r+
		texture2D(u_field,v+vec2(u_texel.x,0.)).r+
		texture2D(u_field,v-vec2(0.,u_texel.y)).r+
		texture2D(u_field,v+vec2(0.,u_texel.y)).r)*.25;
	f.g+=(avg-f.r)*2.;
	f.g*=.995;
	f.r+=f.g;
	gl_FragColor=f;
}`

// Additive raised-cosine stamp into the height channel; the update kernel
// turns it into an expanding ring on its own. Negative strength digs the
// moving trough that reads as a finger wake.
const SPLAT = `precision highp float;
const float PI=3.141592653589793;
uniform sampler2D u_field;
uniform vec2 u_center;
uniform float u_radius,u_strength;
varying vec2 v;
void main(){
	vec4 f=texture2D(u_field,v);
	float d=max(0.,1.-length(u_center-v)/u_radius);
	f.r+=(.5-cos(d*PI)*.5)*u_strength;
	gl_FragColor=f;
}`

// Analytic ambient swells (theme-constant, no sim energy) plus the simulated
// field, both shaded by slope into faint crest/trough lines.
const RENDER = `precision mediump float;
uniform float u_time,u_alpha,u_uvscale;
uniform vec2 u_uvoffset;
uniform vec3 u_color,u_glint;
uniform sampler2D u_field;
float swell(vec2 p){
	float h=.5*sin(dot(p,vec2(.9,.42))*.006+u_time*.19);
	h+=.35*sin(dot(p,vec2(-.6,1.))*.009-u_time*.14);
	h+=.25*sin(dot(p,vec2(.2,-1.))*.013+u_time*.09);
	return h;
}
void main(){
	vec2 p=gl_FragCoord.xy;
	vec2 uv=p*u_uvscale+u_uvoffset;
	float e=1./${SIM}.;
	float h=texture2D(u_field,uv).r;
	float hx=texture2D(u_field,uv+vec2(e,0.)).r-h;
	float hy=texture2D(u_field,uv+vec2(0.,e)).r-h;
	vec2 g=vec2(3.,0.);
	float sx=swell(p+g.xy)-swell(p-g.xy);
	float sy=swell(p+g.yx)-swell(p-g.yx);
	float s=(sy*.8-sx*.6)*2.5+swell(p)*.3+(hy*.8-hx*.6)*36.+h*2.;
	float a=clamp(abs(s),0.,1.)*u_alpha;
	vec3 c=mix(u_color,u_glint,clamp(s*1.2+.5,0.,1.));
	gl_FragColor=vec4(c*a,a);
}`

const hex = (styles: CSSStyleDeclaration, name: string): [number, number, number] => {
	const value = styles.getPropertyValue(name).trim()
	const n = parseInt(value.slice(1), 16)
	return Number.isNaN(n) ? [0.5, 0.5, 0.5] : [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

/** Subtle WebGL water behind the page: a real wave simulation stirred by press-and-drag, clicks, and occasional random drips, tinted by the active theme. */
const Water: Stateful<WaterArgs> = function* (args) {

	let strength = args.strength ?? 0.1
	let started = false

	const start = (canvas: HTMLCanvasElement) => {

		if (started || typeof document === 'undefined') return

		started = true

		const gl = canvas.getContext('webgl', {
			alpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			desynchronized: true,
			powerPreference: 'low-power',
		}) as WebGLRenderingContext | null

		if (!gl) return
		this.signal.addEventListener('abort', () => {
			gl.getExtension('WEBGL_lose_context')?.loseContext()
		}, { once: true })

		const compile = (source: string) => {
			const program = gl.createProgram()!
			for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, source]] as const) {
				const shader = gl.createShader(type)!
				gl.shaderSource(shader, src)
				gl.compileShader(shader)
				gl.attachShader(program, shader)
			}
			gl.linkProgram(program)
			return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
		}

		const update = compile(UPDATE)
		const splatter = compile(SPLAT)
		const render = compile(RENDER)

		// Decoration must never break the app: bail to an inert transparent canvas.
		if (!update || !splatter || !render) return

		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

		for (const program of [update, splatter, render]) {
			const position = gl.getAttribLocation(program, 'a')
			gl.enableVertexAttribArray(position)
			gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
		}

		// Sim texture format: prefer half float (renderable and linear-filterable
		// on iOS/mobile where full float historically is not), fall back to
		// float. Extension presence is not enough in WebGL1 — renderability
		// must be proven with an actual framebuffer attachment.
		const half = gl.getExtension('OES_texture_half_float')
		const candidates: Array<{ type: number; linear: boolean }> = []
		if (half) candidates.push({ type: half.HALF_FLOAT_OES, linear: !!gl.getExtension('OES_texture_half_float_linear') })
		if (gl.getExtension('OES_texture_float')) candidates.push({ type: gl.FLOAT, linear: !!gl.getExtension('OES_texture_float_linear') })

		const texture = (size: number, type: number, filter: number) => {
			const tex = gl.createTexture()!
			gl.bindTexture(gl.TEXTURE_2D, tex)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, type, null)
			return tex
		}

		type Field = { fbo: WebGLFramebuffer; tex: WebGLTexture }
		let fields: [Field, Field] | null = null

		for (const { type, linear } of candidates) {
			const pair: Field[] = []
			for (let i = 0; i < 2; i++) {
				const tex = texture(SIM, type, linear ? gl.LINEAR : gl.NEAREST)
				const fbo = gl.createFramebuffer()!
				gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
				pair.push({ fbo, tex })
			}
			if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
				fields = pair as [Field, Field]
				break
			}
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null)

		// Without a renderable float format the interactive sim is off and the
		// render pass reads this zero texture: ambient swells only.
		const still = texture(1, gl.UNSIGNED_BYTE, gl.NEAREST)
		let read = 0

		const uniform = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name)
		const uTexel = uniform(update, 'u_texel')
		const uCenter = uniform(splatter, 'u_center')
		const uRadius = uniform(splatter, 'u_radius')
		const uStrength = uniform(splatter, 'u_strength')
		const uTime = uniform(render, 'u_time')
		const uAlpha = uniform(render, 'u_alpha')
		const uColor = uniform(render, 'u_color')
		const uGlint = uniform(render, 'u_glint')
		const uUvScale = uniform(render, 'u_uvscale')
		const uUvOffset = uniform(render, 'u_uvoffset')

		let scale = 1

		const resize = () => {
			// Half-resolution buffer: the waves are smooth gradients, so the
			// upscale is invisible and the fill cost stays low.
			scale = Math.min(globalThis.devicePixelRatio || 1, 2) * 0.5
			canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale))
			canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale))
		}

		const readTheme = () => {
			const styles = getComputedStyle(document.documentElement)
			gl.useProgram(render)
			gl.uniform3fv(uColor, hex(styles, '--foreground'))
			gl.uniform3fv(uGlint, hex(styles, '--info'))
		}

		const themes = new MutationObserver(readTheme)
		themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
		this.signal.addEventListener('abort', () => themes.disconnect())

		// ResizeObserver instead of a window listener: the ref runs before
		// layout, when clientWidth is still 0, and the observer's initial
		// callback delivers the real size once the canvas is laid out.
		const sizes = new ResizeObserver(resize)
		sizes.observe(canvas)
		this.signal.addEventListener('abort', () => sizes.disconnect())

		// mediump time for the ambient swell: wrap the clock so sin()
		// precision never degrades. The sim itself is wall-clock free.
		const t0 = performance.now()
		const clock = (now: number) => ((now - t0) / 1000) % 3600

		// Pending splats in CSS px, flushed inside the frame so no GL work
		// happens from listeners or timers.
		const motion = matchMedia('(prefers-reduced-motion: reduce)')
		const pending: Array<{ x: number; y: number; r: number; s: number }> = []

		const splat = (x: number, y: number, r: number, s: number) => {
			if (fields && !motion.matches) pending.push({ x, y, r, s })
		}

		// Sparse random drips: once in a while a droplet lands somewhere and
		// its ring expands calmly.
		let timer: ReturnType<typeof setTimeout> | undefined
		const scheduleDrip = (initial = false) => {
			if (motion.matches || timer != null) return
			timer = setTimeout(drip, initial
				? 1500 + Math.random() * 3000
				: 4000 + Math.random() * 10000)
		}
		const drip = () => {
			timer = undefined
			if (motion.matches) return
			splat(canvas.clientWidth * (0.08 + 0.84 * Math.random()), canvas.clientHeight * (0.08 + 0.84 * Math.random()), 14 + Math.random() * 10, 0.05 + Math.random() * 0.05)
			scheduleDrip()
		}
		const stopDrips = () => {
			if (timer == null) return
			clearTimeout(timer)
			timer = undefined
		}
		this.signal.addEventListener('abort', stopDrips, { once: true })

		// Press-and-drag stirs the water like a finger: the touch lands a drop
		// and the drag digs a moving trough the wave equation answers with bow
		// waves. Listeners stay observational, passive and capture-free: a
		// background layer never owns selection, clicks, focus or scrolling.
		let touch = -1
		let tx = 0
		let ty = 0
		const endStir = (event?: PointerEvent) => {
			if (!event || event.pointerId === touch) touch = -1
		}

		window.addEventListener('pointerdown', event => {
			if (motion.matches || !event.isPrimary || event.button !== 0) return
			if ((event.target as Element | null)?.closest?.('a,button,input,label,select,textarea,[contenteditable]')) return
			touch = event.pointerId
			tx = event.clientX
			ty = event.clientY
			splat(event.clientX, event.clientY, 26, 0.14)
		}, { passive: true, signal: this.signal })

		window.addEventListener('pointermove', event => {
			if (!event.isPrimary || event.pointerId !== touch) return
			// Without pointer capture a release outside the window never fires
			// pointerup; the next buttonless move ends the stir instead.
			if (event.buttons === 0) return endStir(event)
			const samples = event.getCoalescedEvents?.() ?? []
			for (const sample of samples.length ? samples : [event]) {
				const travel = Math.hypot(sample.clientX - tx, sample.clientY - ty)
				if (travel < 9) continue
				tx = sample.clientX
				ty = sample.clientY
				// Trough depth follows finger speed, capped well below splash.
				splat(sample.clientX, sample.clientY, 17, -Math.min(0.08, 0.02 + travel * 0.0012))
			}
		}, { passive: true, signal: this.signal })

		window.addEventListener('pointerup', endStir, { passive: true, signal: this.signal })
		window.addEventListener('pointercancel', endStir, { passive: true, signal: this.signal })
		window.addEventListener('blur', () => endStir(), { signal: this.signal })

		const flush = () => {
			if (!fields || !pending.length) return

			const longest = Math.max(canvas.clientWidth, canvas.clientHeight) || 1

			gl.viewport(0, 0, SIM, SIM)
			gl.useProgram(splatter)

			for (const { x, y, r, s } of pending.splice(0)) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, fields[1 - read].fbo)
				gl.bindTexture(gl.TEXTURE_2D, fields[read].tex)
				gl.uniform2f(uCenter, (x - canvas.clientWidth / 2) / longest + 0.5, (canvas.clientHeight / 2 - y) / longest + 0.5)
				gl.uniform1f(uRadius, Math.max(r / longest, 2.5 / SIM))
				gl.uniform1f(uStrength, s)
				gl.drawArrays(gl.TRIANGLES, 0, 3)
				read = 1 - read
			}
		}

		const step = () => {
			if (!fields) return

			gl.viewport(0, 0, SIM, SIM)
			gl.useProgram(update)
			gl.uniform2f(uTexel, 1 / SIM, 1 / SIM)

			// Two substeps per frame: the canonical way to speed waves up
			// without breaking the kernel's stability limit.
			for (let i = 0; i < 2; i++) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, fields[1 - read].fbo)
				gl.bindTexture(gl.TEXTURE_2D, fields[read].tex)
				gl.drawArrays(gl.TRIANGLES, 0, 3)
				read = 1 - read
			}
		}

		let raf = 0

		const draw = (now: number) => {
			flush()
			step()

			const longest = Math.max(canvas.width, canvas.height) || 1

			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			gl.viewport(0, 0, canvas.width, canvas.height)
			gl.useProgram(render)
			gl.bindTexture(gl.TEXTURE_2D, fields ? fields[read].tex : still)
			gl.uniform1f(uTime, clock(now))
			gl.uniform1f(uAlpha, strength)
			gl.uniform1f(uUvScale, 1 / longest)
			gl.uniform2f(uUvOffset, 0.5 - canvas.width / 2 / longest, 0.5 - canvas.height / 2 / longest)
			gl.drawArrays(gl.TRIANGLES, 0, 3)

			raf = requestAnimationFrame(draw)
		}

		const power = () => {
			cancelAnimationFrame(raf)
			raf = 0
			pending.length = 0
			stopDrips()
			if (motion.matches) {
				gl.clearColor(0, 0, 0, 0)
				gl.clear(gl.COLOR_BUFFER_BIT)
			} else {
				scheduleDrip(true)
				raf = requestAnimationFrame(draw)
			}
		}

		motion.addEventListener('change', power, { signal: this.signal })

		this.signal.addEventListener('abort', () => {
			cancelAnimationFrame(raf)
		}, { once: true })

		readTheme()
		power()
	}

	for (args of this) {
		strength = args.strength ?? 0.1
		yield <canvas class="size-full" ref={el => el && start(el)} />
	}
}

Water.attrs = { 'aria-hidden': 'true', class: 'pointer-events-none fixed inset-0 -z-10' }

export default Water
