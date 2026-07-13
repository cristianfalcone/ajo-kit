# Virtualizacion de listas largas

Estado: implementacion integrada; acceptance de hardware, AT e hydration real pendiente

Fecha del snapshot externo: 2026-07-13

Owner de la decision: `D:\ajo-kit`

Repo complementario inspeccionado: `D:\ajo` para verificar renderer y
lifecycle. Este archivo es la fuente canonica local de la feature en `ajo-kit`
y debe mantenerse alineado con `ai/ui.md`.

## Estado implementado

La arquitectura decidida esta materializada sin capas transitorias:

- `packages/ajo-ui/src/virtual-list.tsx` es la unica Interface publica base;
- `packages/ajo-ui/src/virtual.ts` es el engine privado compartible por futuras
  familias y no tiene subpath publico;
- `src/ui/virtual-list.tsx` es el adapter Stateless de Playa;
- `src/ui/scroll-area.tsx` conserva `scrollAreaVariants` para scrollers internos
  y provee el frame de clip y el recipe de viewport privados que comparte con
  `VirtualList`;
- `@tanstack/virtual-core` esta fijado exactamente a `3.17.4` solo en
  `ajo-ui`;
- `ajo-cloves` no agrega ningun export y se reutiliza su `frame()` existente;
- los defaults publicos cerrados son `overscan=4` y `prerender=20`.

El contrato cubre SSR determinista, primera pasada cliente equivalente,
snapshots inmutables, keys estables, medicion dinamica cacheada por key,
fallback de medicion cero, scroll por key o indice, focus pinning, fallback de
foco al viewport, invalidacion coalescida por frame, cleanup por abort y markup
nativo `ul`/`li`.

Evidencia automatizada del cierre:

- 171 tests de `ajo-ui` y 577 unit tests del workspace;
- typecheck estricto;
- cinco stories VirtualList (empty, 100k fixed, 10k variable, interactive y
  dark) y cuatro stories ScrollArea verdes; las cinco capturas VirtualList se
  inspeccionaron visualmente;
- 49 tests e2e, build cliente/SSR y smoke de produccion verdes;
- `pnpm test:unit` ejecuta tambien el gate reproducible `pnpm test:bundle`, que
  demuestra bytes identicos al elegir
  otra familia por subpath o por root barrel (`1671` bytes, `855` gzip), core
  aislado de `6627` bytes gzip y VirtualList de `9209` bytes gzip incrementales
  con Vite `8.0.16`/esbuild;
- los contract tests cubren append, prepend, delete, reorder interior con
  identidad DOM y medidas por key, cambios de estimate, content replace,
  medicion variable, hidden/zero, ausencia de ResizeObserver, ausencia de
  lecturas repetidas de layout, coalescing por frame, scroll alignment, foco
  adquirido antes del primer post-commit y fuera del overscan, eliminacion
  enfocada y repeated unmount.

No se infiere desde esa automatizacion lo que no probo: hydration real sobre
HTML producido por server, VoiceOver/NVDA/JAWS, Safari fisico en iPhone/iPad,
momentum/elastic overscroll real de iOS, BFCache multinavegacion y perfiles
CPU/RAM de 10 corridas en hardware representativo siguen siendo gates de
acceptance antes de recomendar uso productivo. Ajo todavia no se usa en
produccion, por lo que esos limites no requieren una capa de compatibilidad ni
bloquean el contrato experimental actual.

## Premisa greenfield

`ajo`, `ajo-kit` y esta feature estan en experimentacion y no se usan en
produccion. No existe una Interface publica que debamos conservar ni una base
instalada que debamos migrar. Por lo tanto:

- no hay compatibilidad hacia atras, aliases, deprecations ni shims;
- se puede reemplazar cualquier sketch, test, export o Implementation actual
  si la evidencia produce un Module final mas profundo y cohesivo;
- la secuencia de trabajo optimiza el sistema final, no una transicion gradual;
- los hard gates de correctness, lifecycle, SSR, accesibilidad, bundle y
  performance siguen siendo obligatorios: greenfield elimina deuda, no rigor;
- mientras Ajo siga experimental, tambien puede romperse la nueva Interface
  antes de cerrarla si los spikes demuestran una forma materialmente mejor.

`VirtualList` se implementa y estabiliza antes de reescribir `DataTable`. Es la
primera familia que fija el adapter privado de geometria, el ownership del
scrollport y la recipe compartida con `ScrollArea`; las tablas consumen luego
esa infraestructura en vez de crear un segundo virtualizer.

## Decision ejecutiva

La mejor Ajo-way no es copiar la Interface de una libreria existente, ni crear
un clove headless enorme, ni implementar desde cero los casos dificiles del
scroll variable. Es esta composicion:

```text
@tanstack/virtual-core@3.17.4 (Implementation fijada y oculta)
                    |
                    v
packages/ajo-ui/src/virtual.ts       adapter Ajo privado
                    |
                    v
packages/ajo-ui/src/virtual-list.tsx unica Interface publica base
                    |
                    v
src/ui/virtual-list.tsx              adapter Playa, sibling de ScrollArea
```

Decisiones concretas:

1. La feature publica vive en `ajo-ui` como un Module profundo
   `VirtualList<T, Key>`.
2. `ajo-cloves` no gana un export publico nuevo. `VirtualList` usa su `Host`,
   lifecycle y helpers, pero el motor sigue siendo privado de `ajo-ui`.
3. El motor se apoya en `@tanstack/virtual-core`, fijado a una version exacta y
   cubierto por contract tests Ajo. No se reexporta ningun tipo ni opcion de
   TanStack.
4. `VirtualList` es su propio scroll container. No se anida dentro de
   `ScrollArea`; ambos usan el mismo frame visual y comparten foco, gutter,
   overscroll y scrollbar en sus viewports nativos.
5. V1 es una lista vertical, single-lane, data-driven y con element scrolling.
   Incluye alturas fijas o dinamicas, stable keys, SSR determinista, focus
   pinning y scroll imperativo. No incluye grid, masonry, window scrolling,
   horizontal, sticky, recycling ni semantica de chat.
6. No se recicla un nodo Ajo entre identidades. Una fila que sale de la ventana
   se desmonta y termina su lifecycle; el estado durable debe vivir en los
   datos o en su owner.
7. No se conserva la forma de ningun experimento previo. La primera
   implementacion productiva interna entra como un corte limpio y borra los
   caminos reemplazados.

Los gates implementados de correctness, bundle y browser stories estan verdes.
Hydration real, perfiles de hardware y QA fisica/AT siguen abiertos. Si esos
gates encuentran un problema, se corrigen la Interface o la Implementation
directamente mientras el sistema siga greenfield; no se expone TanStack ni se
mantiene una forma inferior por compatibilidad.

## Por que hace falta virtualizar

Una lista larga puede pagar cuatro costos diferentes:

- crear VNodes y ejecutar renderers para elementos que no se ven;
- reconciliar y retener miles de nodos DOM;
- recalcular style/layout sobre un arbol grande;
- pintar y componer contenido fuera del viewport.

`content-visibility:auto` reduce principalmente layout y paint de subtrees
offscreen, pero conserva VNodes, DOM, memoria, reconciliacion y listeners. La
virtualizacion reduce el conjunto materializado a la ventana visible mas un
buffer. Son herramientas distintas, no sinonimos.

El contrato de la feature no debe ser "usar virtualizacion cuando `length` es
grande". Debe ser una eleccion explicita, basada en profiling, porque retirar
nodos del DOM tambien cambia find-in-page, impresion, lectura asistiva, foco y
lifecycle local.

## Objetivos

- DOM acotado por viewport, no por cantidad total de items.
- Interface trivial para el caso comun.
- Alturas dinamicas sin saltos permanentes ni scans completos del DOM.
- Stable identity ante append, prepend, delete, reorder y refresh.
- Scroll nativo: rueda, touch, momentum, teclado y scrollbar del browser.
- SSR sin tocar DOM y primera renderizacion cliente compatible con la salida
  server.
- Lifecycle Ajo: cleanup por `host.signal`, controller estable, sin `dispose`.
- Semantica nativa de lista basada en `ul`/`li` y posicion logica expuesta a
  assistive technology.
- Integracion visual exacta con `ScrollArea`, sin duplicar scroll owners.
- Ningun costo de bundle para una app que no importa `VirtualList`.
- Verificacion de performance, no afirmaciones basadas solo en reputacion de
  una libreria.
- Un solo foundation privado de virtualizacion reutilizable por renderers de
  familia posteriores, sin convertirlo en API headless publica.

## No objetivos de V1

- Grids 2D, masonry o multi-lane.
- Window/document scrolling.
- Lista horizontal y RTL horizontal.
- Headers sticky o un `rangeExtractor` publico.
- Pooling/recycling de DOM entre keys.
- Fetching, infinite query, paginacion o cache de datos.
- Virtualizar automaticamente `Select`, `Command`, `DataTable` o
  `MessageScroller`.
- Garantizar find-in-page, fragment navigation, lectura AT o tabbing de items
  que no existen en el DOM.
- Superar el limite maximo de pixels de un scroll extent del browser.
- Un escape hatch hacia la instancia de TanStack.
- Compatibilidad con sketches, exports o comportamiento accidental anterior.

La Implementation elegida conoce varias de esas capacidades, pero no deben
aparecer en la Interface hasta que una familia Ajo concreta las necesite. Tener
codigo debajo del seam no obliga a hacer publica su complejidad.

## Arquitectura local observada

La arquitectura canonica de `D:\ajo-kit\ai\ui.md` ya decide la direccion:

```text
ajo-cloves  ->  ajo-ui  ->  src/ui  ->  routes/stories
behavior        unstyled    Playa       product
and lifecycle   families    theme       composition
```

### `ajo-cloves`

- Posee comportamiento general, lifecycle, sensores y host utilities.
- Los cloves tienen forma `(host, options?) => view`, identity estable, inputs
  live y cleanup exclusivo por `host.signal`.
- `scrolling` hace tracking frame-coalesced de un target vivo.
- `resize` comparte un `ResizeObserver` entre targets.
- `overflow` compone `scrolling` y `resize` para estampar edges.
- El package no tiene runtime dependencies: solo `ajo` como peer.
- Su regla explicita es "evidence-driven: no consumer, no clove".

Virtualizar no es solamente otro sensor. Coordina datos, keys, render window,
medicion, semantica de filas y scroll targeting. Exponerlo como clove obligaria
al caller a aprender attrs, transforms, spacers, medicion y ARIA. Eso reduce la
Depth y replica decisiones en cada lista.

### `ajo-ui`

- Posee familias unstyled, markup, accesibilidad, composicion y engines de
  dominio de componentes.
- Ya mantiene engines privados como `floating.ts`, `collection.ts`, `bar.ts`,
  `segments.ts` y `availability.ts`.
- Depende de `ajo-cloves` y puede usar sus contratos de lifecycle sin hacerlos
  parte de la Interface de una familia.
- `MessageScroller` es el precedente mas cercano: su semantica y coordinacion
  viven en `ajo-ui`; scroll, resize, overflow, frame y timer viven abajo.

Una lista virtual generica y data-driven es una familia de componente. Su
engine privado pertenece junto a esos engines, aun si en el futuro lo consumen
dos o tres familias de `ajo-ui`.

### `src/ui/scroll-area.tsx`

`ScrollArea` es una composicion Stateless y tematica de dos responsabilidades:

- un frame visual con `overflow:hidden`, radio, superficie y focus ring;
- un unico `div` viewport nativo que conserva atributos, eventos, `ref`, foco y
  estado de scroll.

El viewport concentra:

- `overflow-*` por axis;
- `overscroll-contain`;
- `scrollbar-soft`, con el thumb completo compartido;
- `scrollbar-gutter:stable`;
- posicion relativa y radio heredado.

El mismo frame envuelve el `ul` de Playa `VirtualList`. Asi el browser recorta
el paint del scrollbar contra cualquier radio sin achicar el thumb, acortar el
track, recortar el focus ring ni cambiar el scroll owner que usa el virtualizer.
`class` y `style` pertenecen al frame visual; los demas atributos DOM y el
`ref` permanecen en el viewport real.

No existe un `ScrollArea` base en `ajo-ui`, y no hace falta inventarlo: sin el
tema seria casi un pass-through del `div`. Su recipe si es el vocabulary visual
correcto para `VirtualList`.

### `MessageScroller`

El engine actual consulta todos los items montados y lee sus rects para obtener
visibilidad, anchor y preservacion. Esa estrategia es adecuada para una
transcripcion acotada con `content-visibility:auto`, pero su snapshot de
geometria es O(n DOM) y no puede escalar a decenas de miles de mensajes.

No debe apilarse un virtualizer alrededor del MessageScroller actual. Para
virtualizarlo algun dia, la familia tendra que ser data-driven y el nuevo motor
debera reemplazar, no complementar, `querySelectorAll`, `MutationObserver`, el
scan de rects y la compensacion manual de prepend.

## Realidad de la plataforma web

### No hay virtual scroller nativo

El proyecto WICG `<virtual-scroller>` ya no se desarrolla activamente. El
propio explainer identifica el problema fundamental: una libreria que retira
contenido del DOM no puede hacer que ese contenido siga participando
plenamente de accessibility navigation, find-in-page, fragment navigation o
crawling.

Por lo tanto, no existe un primitive nativo inminente que convenga esperar ni
un polyfill que pueda recuperar toda esa semantica.

### `ResizeObserver`

Es el primitive correcto para viewport e items dinamicos. Entrega mediciones
despues de layout y antes de paint. Hay que:

- usar `borderBoxSize` cuando este disponible;
- evitar leer `getBoundingClientRect()` para todas las filas durante scroll;
- batch-ear cambios de muchas filas;
- no escribir tamaños que retroalimenten al mismo observer;
- aceptar que el browser puede diferir notificaciones y emitir
  `ResizeObserver loop completed with undelivered notifications`.

No se debe silenciar globalmente ese error en produccion. Los tests pueden
filtrar solo el mensaje especifico si el engine converge; una repeticion
continua es un bug.

### `scrollend`

El evento de `Element` es Baseline 2025 en browsers actuales, pero una libreria
debe conservar un fallback temporal para clientes anteriores. Resulta util
para aplicar una correccion acumulada sin cancelar touch/momentum scrolling.

### Scroll anchoring

Los browsers que soportan scroll anchoring intentan mantener estable un nodo
visible cuando cambia contenido anterior. Un virtualizer tambien corrige
offsets, y las dos politicas pueden competir. El viewport virtual debe usar
`overflow-anchor:none`; el engine es el unico owner de la compensacion.

### `content-visibility:auto`

Desde septiembre de 2025 esta disponible en los tres engines mayores. Conserva
el contenido en DOM y accessibility tree y puede ser mejor que virtualizar
cuando importan find-in-page, impresion o lectura completa. No reduce DOM ni
el costo de construir/reconciliar todos los items.

## Research de librerias y frameworks

Los estados y versiones siguientes fueron verificados el 2026-07-12. Son un
snapshot, no una promesa de "latest" futura.

| Referencia | Estado observado | Fortaleza | Leccion para Ajo |
|---|---|---|---|
| TanStack Virtual Core | `3.17.4`, MIT, cero runtime dependencies; release del 2026-07-12 | Headless, framework-agnostic, sizes dinamicos, custom ranges, window/element, lanes, anchoring de chat, correcciones iOS y SSR inputs | Mejor Implementation debajo de un adapter propio; su Interface completa no debe filtrarse |
| Virtua | `0.49.3`, release del 2026-07-11, aprox. 3 kB gzip por componente segun su proyecto | DX casi zero-config, sizes dinamicos, reverse, iOS, varios frameworks | Confirma que el caso comun debe parecer un componente, no un algebra de layout; su benchmark sigue WIP y no tiene adapter Ajo |
| React Virtuoso | `4.18.10`, activo en julio de 2026 | Variable/dynamic size automatico, grouped, grid, table, window y bi-directional loading | Excelente referencia de UX de alto nivel; el Message List especializado es un producto comercial separado |
| react-window | `2.2.7`, release del 2026-02-13 | Interface pequena para List y Grid, SSR dimensions, overscan | Buen ejemplo de superficie publica acotada; menos adecuado para reverse/chat y politicas dinamicas complejas |
| react-virtualized | `9.22.6`; su propio README recomienda considerar react-window | Catalogo historico muy amplio | Referencia de casos, no base moderna para una feature nueva |
| Vue Virtual Scroller | `3.0.4`, activo en 2026 | Recycle/Dynamic scrollers, SSR prerender, cache por key | Stable keys y prerender son valiosos; pooling entre identidades contradice el lifecycle keyed de Ajo |
| Angular CDK Scrolling | API actual con `CdkVirtualScrollViewport`, strategy seam, template cache y fixed-size strategy | Integracion framework/viewport y buffers en pixels | Buena separacion de strategy; su autosize variable ha sido historicamente experimental, por lo que fixed-only no alcanza |
| Lit Labs Virtualizer | `2.1.1`, late prerelease con warning explicito | Componente/directive declarativo, flow, grid, ResizeObserver y `scrollIntoView` virtual | Buen DX y prueba de adapter no-React; no conviene depender de un package Labs sin estabilidad 1.0 |
| WICG virtual-scroller | desarrollo detenido | Documenta limites de userland | La accesibilidad incompleta es una restriccion, no un bug que ARIA pueda borrar |

### TanStack Virtual como referencia principal

Su Interface publica completa pide `count`, `getScrollElement` y
`estimateSize`, y ofrece `getItemKey`, `overscan`, `measureElement`,
`scrollToIndex`, `initialRect`, `initialOffset`, measurement snapshots,
horizontal, lanes, custom range extraction y otras policies.

En mayo de 2026 el proyecto publico una auditoria de performance y una
reescritura parcial del hot path. Tambien documento fixes especificos para
iOS WebKit: escribir `scrollTop` durante touch/momentum cancela la fisica
nativa, por lo que ciertas correcciones se difieren hasta el settle. La
release `3.17.4` todavia arreglo leakage de ese estado al cambiar el scroll
element. Esto es evidencia de que "variable height robusto" contiene mucha
complejidad accidental del browser.

El artefacto ESM `3.17.4` mide 44,327 bytes sin minificar. Mediciones locales
con Terser 5.48 (module, dos passes y top-level mangling) dieron alrededor de
22.3 kB minificados y 6.4-6.5 kB gzip; pequeñas diferencias de opciones de
format y compresion cambian el resultado. No es gratis, pero es razonable para una importacion
opt-in de `ajo-ui/virtual-list` y mucho menor que reabrir esos bugs en cada
familia. El budget final incluye tambien el adapter y el componente Ajo.

### Por que no Virtua como dependencia

Virtua es la referencia mas cercana al objetivo "micro y zero-config", pero
su package principal es component-first para React/Vue/Solid/Svelte. Existe
trabajo de terceros para vanilla, no un core oficial con un seam tan claro y
estable como `@tanstack/virtual-core`. Adaptarlo a Ajo implicaria depender de
otra capa de binding o copiar internals 0.x.

### Por que no escribir un motor propio ahora

Un motor propio puede usar un Fenwick tree y obtener point updates y prefix
lookup O(log n). Eso resuelve el problema matematico, pero no resuelve por si
solo:

- measurement cache por key ante reorder/prepend;
- scroll target que cambia mientras aparecen medidas reales;
- subpixel rounding entre engines;
- scroll hacia atras con estimates incorrectos;
- touch, momentum y elastic overscroll de iOS;
- retargeting y callbacks tardios de elementos detached;
- resize transversal que cambia todas las alturas de texto;
- SSR, hydration y restauracion;
- foco sobre una fila que sale de la ventana.

Un engine propio puede ser mas pequeno, pero hoy pierde en robustez,
reliability y tiempo de mantenimiento. La Ajo-way micro debe medirse en la
Interface que aprende el caller y en la complejidad que elimina del repo, no
en perseguir la menor cantidad de lineas internas a cualquier costo.

## Design it twice: alternativas comparadas

Se diseñaron tres Interfaces radicalmente distintas y una alternativa de
dependencia directa.

### A. Clove headless amplio en `ajo-cloves`

Forma: `virtualize(host, options) => view`, con attr bags para viewport,
content e items; axis, anchor, lanes, include, scroll target, SSR rect y
placement.

Ventaja: maxima flexibilidad y reutilizacion. MessageScroller, DataTable y una
app custom podrian compartir un solo primitive.

Costo: el caller aprende demasiados invariantes de layout y DOM. El Module se
vuelve menos profundo; grid, sticky, lanes y window scrolling entran antes de
tener consumidores. Tambien contradice "no consumer, no clove" y hace publica
una semantica que despues sera dificil reducir.

### B. `VirtualList` en `ajo-ui` con motor propio

Forma: un componente data-driven con `items`, key, estimate y renderer. Un
engine privado usa prefix sums/Fenwick, `ResizeObserver`, spacers o items
posicionados y sensores de cloves.

Ventaja: bundle minimo, control total, integracion Ajo pura.

Costo: toda la complejidad de scroll variable e iOS pasa a ser nuestra. La
matematica es micro; el comportamiento cross-browser no. Seria elegante solo
si redujeramos el contrato a fixed-size, lo que no cubre las listas reales que
motivan la feature.

### C. `VirtualList` en `ajo-ui` sobre core probado

Forma: la misma Interface pequeña de B, con un adapter interno exacto sobre
TanStack Virtual Core.

Ventaja: mayor Depth y Locality. El caller aprende una sola familia; bugs de
medicion, scroll targeting y browser quedan detras del seam. La dependencia es
in-process, MIT, sin transitivas y sustituible.

Costo: unos 6.4 kB gzip antes del adapter, version pinning y dependencia sobre
los hooks `_didMount()`/`_willUpdate()` que usan los adapters oficiales.

### D. Importar TanStack directamente desde aplicaciones

Ventaja: cero codigo framework propio.

Costo: cada caller repite lifecycle, invalidacion Ajo, markup, refs, SSR,
styling y accesibilidad. La dependencia atraviesa todo el repo y su Interface
se convierte accidentalmente en contrato Ajo. Falla el deletion test.

### Comparacion

| Alternativa | Depth | Locality | Interface | Reliability | Fit local |
|---|---:|---:|---:|---:|---:|
| A. Clove headless amplio | media | alta | grande | alta con core | media |
| B. Componente + motor propio | alta | alta | pequena | incierta al inicio | alta |
| C. Componente + core oculto | muy alta | muy alta | pequena | mayor | muy alta |
| D. TanStack directo | baja | baja | grande/externa | alta | baja |

Recomendacion: C.

El seam externo es `VirtualList`. El adapter TanStack es una Implementation,
no una segunda Interface publica. El Module es profundo porque borra del
caller medicion, range, cache, posicionamiento, correccion, observers,
cleanup, SSR, ARIA posicional y foco.

## Placement definitivo

### `ajo-ui`

Archivos previstos:

```text
packages/ajo-ui/src/virtual.ts
packages/ajo-ui/src/virtual-list.tsx
packages/ajo-ui/tests/virtual-list.test.ts
packages/ajo-ui/tests/virtual-list-surface.types.ts
```

`virtual.ts` es source-internal. Adapta `Virtualizer`,
`observeElementRect`, `observeElementOffset` y `elementScroll` al lifecycle
Ajo. No es un subpath publico.

`virtual-list.tsx` es el unico external seam y entra por:

- `ajo-ui/virtual-list` mediante el wildcard existente;
- el root barrel `ajo-ui`.

`@tanstack/virtual-core` se agrega a `dependencies` de `ajo-ui` con version
exacta. El snapshot del 2026-07-13 resuelve `latest` a `3.17.4`, sin runtime
dependencies, con `sideEffects:false` e integridad
`sha512-nGm5KteqxasUdThLc2izl6dHUqLv0LQj7Nuyo5gYalTPf/U8a9ermvsl7reT+6ioBW1l8WfpP/mcU338nLXpqw==`.

```json
{
  "dependencies": {
    "@tanstack/virtual-core": "3.17.4"
  }
}
```

### `ajo-cloves`

No cambia su catalogo. `ajo-ui` reutiliza:

- `Host` y la forma de clove interna;
- `dom` para SSR/DOM real;
- `statefulRootAttrs` para el host publico;
- `callRef` si la Interface compone un ref del caller;
- `host.signal` como owner de cleanup.

No se componen `scrolling` y `resize` en paralelo con TanStack: el core ya
instala esos observers. Duplicarlos agregaria dos fuentes de verdad y doble
trabajo.

### `src/ui`

Archivos previstos:

```text
src/ui/virtual-list.tsx
tests/stories/virtual-list.stories.tsx
```

El adapter es Stateless y agrega solamente clases y defaults visuales.

`src/ui/scroll-area.tsx` extrae un recipe root interno compartido. Tanto
`ScrollArea` como `VirtualList` lo usan, pero el helper no entra al root barrel
si ningun consumidor publico lo necesita.

## Interface publica propuesta

La Interface final debe seguir pequeña incluso si la Implementation tiene
muchas capacidades:

```ts
import type { Children, IntrinsicElements } from 'ajo'
import type { OmitArg } from 'ajo-ui/utils'

export type VirtualListScrollOptions = {
	align?: 'center' | 'end' | 'nearest' | 'start'
}

export type VirtualListKey = number | string

export type VirtualListTarget<Key extends VirtualListKey = VirtualListKey> =
	| { index: number; key?: never }
	| { index?: never; key: Key }

export type VirtualListApi<Key extends VirtualListKey = VirtualListKey> = {
	/** Brings one current source item into view; false means unavailable. */
	scrollTo(
		target: VirtualListTarget<Key>,
		options?: VirtualListScrollOptions,
	): boolean
}

export type VirtualListArgs<
	T = unknown,
	Key extends VirtualListKey = VirtualListKey,
> = OmitArg<IntrinsicElements['ul'], 'children' | 'role'> & {
		/** Immutable ordered logical collection. */
		items: readonly T[]

		/** Stable unique identity across insert, delete, reorder and refresh. */
		getItemKey: (item: T, index: number) => Key

		/** Positive initial border-box block size until a row is measured. */
		estimateSize: number | ((item: T, index: number) => number)

		/** Renders content inside the internally owned keyed `li`. */
		renderItem: (item: T, index: number) => Children

		/** Extra rows before and after the visible range. Candidate default: 4. */
		overscan?: number

		/** Initial rows emitted by SSR and the matching first client pass. */
		prerender?: number

		/** Receives one stable controller. */
		setApi?: (api: VirtualListApi<Key>) => void
	}
```

Los defaults de `overscan` y `prerender` se fijan antes del export publico
despues de los benchmarks. Los candidatos iniciales son 4 y 20. No deben
crecer mas opciones por conveniencia durante el spike.

### Ejemplo

```tsx
import type { VirtualListApi } from '/src/ui/virtual-list'
import { VirtualList } from '/src/ui/virtual-list'

type User = {
	id: string
	name: string
	summary: string
}

let list: VirtualListApi<string> | undefined

<VirtualList
	aria-label="Users"
	class="h-96 rounded-lg edge bg-card"
	items={users}
	getItemKey={user => user.id}
	estimateSize={72}
	renderItem={user => (
		<div class="px-4 py-3">
			<strong>{user.name}</strong>
			<p class="text-sm text-muted-foreground">{user.summary}</p>
		</div>
	)}
	setApi={api => list = api}
/>

// Desde un handler Ajo:
list?.scrollTo({ key: users[500].id }, { align: 'center' })
```

La altura es responsabilidad del layout, igual que en `ScrollArea`. Una lista
sin block size util no tiene viewport que virtualizar.

### Lo que no se expone

- `Virtualizer` o `VirtualizerOptions`.
- `VirtualItem`, `getVirtualItems` o total size.
- `measureElement`, refs o `data-index`.
- Provider/Viewport/Content/Item parts.
- `rangeExtractor`, lanes, axis, `scrollMargin` o drivers.
- styles de posicionamiento o spacer.
- un `instance`, `options` passthrough o escape hatch.

Si un caller necesita esa superficie, todavia no necesita "una opcion mas":
esta señalando otra familia o un futuro Module headless que debe diseñarse con
evidencia propia.

## Contratos de datos e identidad

### Snapshot inmutable

`items` representa un snapshot ordenado. Reusar la misma referencia significa
misma membresia, orden e identidad; los campos de valor de cada entidad si
pueden cambiar. Para append, prepend, delete o reorder se entrega una referencia
nueva.

Esta regla permite que el adapter mantenga callbacks internos estables aunque
el caller escriba lambdas inline en TSX. Los wrappers leen el snapshot y los
callbacks actuales desde celdas internas estables. Ante una referencia nueva se
valida la secuencia completa de keys:

- si count, orden y keys son iguales, es un update de contenido; se conserva la
  identidad de `getItemKey` upstream y el measurement cache;
- si cambia la estructura, se crea la nueva secuencia/closure de keys y se
  mantiene la anterior hasta completar `setOptions`, para que el core pueda
  comparar ambos estados donde su policy lo requiera;
- un cambio de `estimateSize` afecta estimates futuros mediante el wrapper
  estable; no invalida mediciones reales sanas de forma global.

En cada render del owner se comprueban al menos length y edge keys, y toda
violacion detectable lanza un error sincronico. Un reorder interior in-place
que conserve esos probes viola el contrato aunque no sea detectable sin pagar
O(n). `getItemKey` y `estimateSize` deben ser puros, deterministas y admitir mas
de una invocacion.

### Keys

`getItemKey` es obligatorio. No existe fallback a index.

- La key debe ser `string` o `number` finito.
- Debe ser unica en todo el snapshot.
- Debe permanecer igual mientras la entidad sea la misma.
- Se valida el snapshot completo cuando cambia su referencia.
- Las medidas se cachean por key, no por posicion.

Esto conserva medidas e identity Ajo con la entidad correcta aunque cambie su
indice. V1 es top-anchored: conserva el offset numerico del viewport, pero no
promete que la misma entidad permanezca visible ante prepend o un reorder.
Una familia end-anchored como MessageScroller tiene otra policy y debe usarla
de forma explicita.

### Estimates

El estimate es un performance hint, no verdad durable. Debe ser finito y mayor
que cero. Conviene estimar cerca del tamaño real y, ante duda, ligeramente
alto para reducir saltos del scroll extent.

Una medicion observada de cero por un ancestor temporalmente oculto no borra
la ultima medida positiva. Si nunca hubo una, permanece el estimate. Esto no es
el default implicito del core: el adapter debe proveer una policy explicita de
`measureElement`/cache que descarte ceros transitorios y probar
`hidden -> visible`. Un item realmente colapsado debe quitarse del source; no debe quedar
como una fila logica fantasma de altura cero.

## Markup y layout

La familia usa semantica nativa fija; el caller no puede reemplazar el `role`
del `ul` generico:

```text
ul[data-slot=virtual-list]        scroll owner
├── li[data-slot=virtual-list-item]  item posicionado y medido
├── li[data-slot=virtual-list-item]  item posicionado y medido
├── ...                              visible + overscan + focused pin
└── li[data-slot=virtual-list-sizer][aria-hidden][role=none]
                                      sizer/spacer total
```

Cada fila materializada:

- recibe la key Ajo estable;
- lleva el indice privado que necesita `measureElement`;
- usa posicion absoluta en el main axis;
- se posiciona con `top`, no con transform;
- conserva el orden DOM del source;
- recibe `aria-posinset=index + 1` y `aria-setsize=items.length`;
- contiene el resultado de `renderItem`;
- queda observada mientras esta montada.

El sizer final crea el scroll extent total. Todo selector posicional de hijos
como `:first-child`, `:last-child` o `:nth-child` queda fuera del contrato: el
rango montado cambia y el sizer tambien es un `li`. Themes y callers usan los
slots, no la posicion DOM. El viewport usa
`overflow-anchor:none`. El caller conserva estilos internos del contenido,
pero no es owner de la posicion main-axis del wrapper.

Como `ajo-ui/virtual-list` es util sin Playa, la base posee todos los estilos
funcionales: `position:relative`, overflow vertical, ocultamiento del off-axis,
`overflow-anchor:none`, reset de margin/padding/list-style/markers, tamaño y
posicionamiento del sizer y de las filas. Cada wrapper medido fuerza `margin:0`
y `box-sizing:border-box`; ni `gap` del `ul` ni margins externos participan del
layout. Padding, border y spacing visual pertenecen al contenido interno de la
fila. El viewport usa `tabindex=0` por default y puede recibir `aria-label` o
`aria-labelledby` cuando necesite un nombre accesible. El adapter Playa agrega
solamente el recipe visual. Los estilos criticos se componen despues del
`style` del caller.

Se elige posicionamiento por item en V1 porque permite mantener una fila con
foco aunque este fuera del rango contiguo. Un bloque flow traducido puede ser
mejor para ciertos scrolls, pero no puede representar un pin no contiguo sin
materializar todo el intervalo. V1 posiciona cada wrapper con `top`: transform
crearia stacking contexts y containing blocks que alteran z-index y descendientes
fixed/floating. El benchmark puede rechazar la Implementation si `top` no
cumple, pero no cambia esta semantica silenciosamente ni agrega un prop.

## Lifecycle Ajo y adapter interno

El adapter privado toma como referencia los bindings oficiales de Lit, Solid y
React, pero debe respetar que Ajo no tiene layout effect y que el host todavia
no esta conectado durante la primera ejecucion del generator:

1. Crear una sola instancia de `Virtualizer` durante el primer ciclo del host.
2. Resolver options con funciones internas estables.
3. Antes de cada `yield`, incrementar un generation token y agendar un unico
   microtask post-commit abort-safe. El microtask solo trabaja si sigue siendo
   la generacion mas reciente, el signal esta vivo y el host ya esta conectado.
4. En el primer post-commit conectado, obtener una vez el cleanup de
   `_didMount()` y ejecutar `_willUpdate()` para instalar/sincronizar observers.
5. En post-commits posteriores, ejecutar `_willUpdate()` despues de que Ajo ya
   reconcilio DOM y aplico refs. Un contract test instrumentado debe probar ese
   orden; no se asume que el microtask equivale a un layout effect.
6. En `onChange`, llamar `host.next()` solo cuando cambia el conjunto de
   indices renderizados o un valor que el JSX debe reflejar.
7. Desconectar exactamente una vez cuando aborta `host.signal`; un microtask
   pendiente comprueba signal e `isConnected` antes de hacer trabajo.

El callback no hace un render Ajo por cada pixel de scroll. Un scroll puro que
mantiene range y total no construye VNodes nuevos. Una medicion puede cambiar
total u offsets con el mismo range y, sin writes directos, si requiere un
render. El adapter puede aplicar writes directos idempotentes como el modo
actual de los bindings React solamente si el spike prueba que reduce trabajo
sin crear una segunda fuente de verdad.

Toda excepcion asincrona propia del adapter se enruta por `host.throw(error)`
solo si el signal sigue vivo; despues del abort se ignora. Callbacks tardios de
nodos detached se ignoran por element identity y generation token.

## SSR e hydration

SSR no debe devolver una lista vacia por accidente ni tocar globals DOM.

Contrato:

- `prerender` es un entero no negativo.
- El server materializa los primeros `min(prerender, items.length)` items.
- La primera pasada cliente produce exactamente el mismo rango determinista.
- La observacion del viewport real se activa despues de esa primera pasada;
  entonces una invalidacion normal cambia a la ventana real.
- `setApi` no se invoca durante SSR: no entrega un controller muerto. Se invoca
  una vez en el primer post-commit cliente conectado.
- En SSR, Ajo aborta el signal despues del unico `yield`; cualquier microtask
  pendiente observa el abort y no monta observers ni llama `host.throw`.
- `prerender={items.length}` es posible, pero si se necesita DOM completo en
  cliente corresponde usar `ScrollArea`, no abusar de este knob.

Hay que probar hydration con contenido y keys diferentes, no solo comparar
strings SSR. Ajo no serializa keys al HTML; la primera ventana debe coincidir
para evitar reutilizar el nodo server equivocado antes de la reconciliacion.

## Scroll targeting y correcciones

`scrollTo({ index })` valida que el indice sea entero y este en el snapshot
actual. `scrollTo({ key })` resuelve la identidad actual mediante el indice
interno de keys. Devuelve `false` si no hay viewport DOM, el indice esta fuera
de rango o la key ya no existe.

Para un destino aun no medido:

1. el core calcula un offset estimado;
2. el rango destino se materializa;
3. sus filas se miden;
4. el target se reconcilia hasta quedar alineado o alcanzar una safety valve;
5. la correccion final nunca usa animacion.

V1 expone solamente posicionamiento inmediato; no expone `behavior`. Smooth
scroll con tamaños desconocidos cambia de destino a medida que aparecen
mediciones y necesita un contrato propio de UX/reduced motion. Puede evaluarse
despues sin afectar el seam actual. Las correcciones internas siempre son
inmediatas.

Cuando cambia la medida de un item anterior al viewport, el engine aplica la
correccion de measurement que provee el core. Esto es distinto de cambiar el
dataset: la lista top-anchored no promete data anchoring ante prepend/reorder.
Durante touch/momentum no escribe
`scrollTop` repetidamente: acumula deltas y los aplica al settle. Usa
`scrollend` solamente cuando el element lo soporta, habilitando explicitamente
esa opcion porque el default upstream es `false`; en browsers anteriores usa el
fallback debounce/settle del core.

## Foco, estado y accesibilidad

### Focus pinning

Si `document.activeElement` esta dentro de una fila que saldria del overscan,
esa key se agrega al rango materializado. La fila permanece posicionada en su
offset logico aunque no sea visible.

Si el nuevo snapshot elimina esa key, justo antes de desmontarla se vuelve a
comprobar que `document.activeElement` siga dentro de esa fila. Solo entonces
el foco pasa al viewport con `preventScroll:true`. Asi se evita tanto caer
silenciosamente en `body` como robar foco que el caller ya movio.

El foundation privado no hardcodea ese destino: recibe una policy de fallback
del renderer. `VirtualList` le entrega su viewport; una familia posterior como
`VirtualDataTable` puede entregar su table nombrada sin forkear pinning,
measurement ni range.

Focus pinning no soluciona el tab order completo. Al presionar Tab, el browser
solo conoce elementos montados. Una lista generica no debe inventar navigation
de listbox, grid o feed. Esas familias necesitan una politica data-aware que
materialice el target antes de mover foco o `aria-activedescendant`.

Por la misma razon, `VirtualList` no es el default para formularios o listas
que requieren tabbing secuencial por todos sus controles. En esos casos se usa
DOM completo con `content-visibility`, paginacion/load-more, o una familia
compuesta con navigation propia.

### Estado local

Ajo destruye una Stateful row al retirarla del DOM y ejecuta su cleanup. No se
mantiene un cache de hosts detached y no se recicla el mismo DOM node para otra
key.

Consecuencia documentada: inputs y estado que deban sobrevivir al scroll deben
ser controlled o vivir en un owner externo. El virtualizer no es un store.

### Limites honestos

`aria-posinset` y `aria-setsize` informan posicion y total logicos, pero no
crean nodos ausentes para un screen reader. Tampoco restauran find-in-page,
anchors o impresion completa.

Guia:

- contenido que debe ser buscable, imprimible o leido secuencialmente: DOM
  completo, posiblemente con `content-visibility:auto`;
- lista cuyos items pueden aparecer/desaparecer del DOM sin romper su tarea:
  `VirtualList`;
- `listbox`, `menu`, `grid`, `feed` o `log`: integracion especifica de la
  familia, nunca solo cambiar un `role` del componente generico.

Los tests automatizados de ARIA no sustituyen QA manual con screen reader.

## Integracion con ScrollArea

Uso correcto:

```tsx
<ScrollArea>{smallOrCompleteDom}</ScrollArea>

<VirtualList
	items={largeData}
	getItemKey={...}
	estimateSize={...}
	renderItem={...}
/>
```

Uso incorrecto:

```tsx
<ScrollArea>
	<VirtualList ... />
</ScrollArea>
```

o el inverso.

El nesting crea dos candidatos a scroll owner, vuelve ambiguos `scrollTop`,
keyboard scrolling, `ResizeObserver`, focus ring y scrollbar. `VirtualList`
ya es el ScrollArea especializado para datos virtuales.

El recipe compartido debe producir el mismo:

- focus-visible ring;
- scrollbar y gutter;
- overscroll containment;
- rounded inheritance;
- slot naming coherente.

No se agrega un prop `virtual` a `ScrollArea`: mezclaria dos contratos que
tienen lifecycle, markup y semantica radicalmente distintos.

## Decision guide: ScrollArea, content visibility o VirtualList

| Necesidad | Eleccion |
|---|---|
| No se midio un cuello, o DOM/reconciliation ya son baratos | `ScrollArea` y DOM normal |
| Se necesita DOM/AT/find/print completo y profiling muestra layout/paint offscreen como cuello | `ScrollArea` + `content-visibility:auto` en bloques |
| Profiling muestra que creacion, renderer, reconciliacion, DOM o memoria dominan, y la tarea tolera items desmontados | `VirtualList` |
| La tarea exige recorrido secuencial completo pero el DOM total no es viable | Paginacion o load-more accesible |
| Opciones compuestas con roving/activedescendant | La familia (`Select`, `Command`, etc.) debe integrar el engine |
| Chat con prepend, append-follow, live announcements y reading anchor | `MessageScroller`, despues de un refactor data-driven dedicado |

No se fija un threshold numerico universal. El plan agrega una story comparativa
para encontrar crossover con filas simples, medianas y pesadas en este renderer.
Al usar `content-visibility:auto`, el recipe tambien define un
`contain-intrinsic-size` medido para evitar saltos y un override de impresion:
`@media print { content-visibility: visible; }`.

## Error contract

- Duplicate key: `TypeError` sincronico con key e indices.
- Key numerica no finita: `TypeError`.
- `estimateSize` no finito, cero o negativo: `RangeError` al evaluarlo.
- `overscan` o `prerender` no enteros o negativos: `RangeError`.
- `scrollTo` con target mal formado: `TypeError`; con indice fuera de rango o
  key ausente: `false`, sin clamp ni fallback silencioso.
- Sin DOM/SSR: vista estable e inerte.
- Sin `ResizeObserver`: estimates mas medicion inicial disponible; no se rompe
  el mount, pero no hay seguimiento dinamico continuo.
- Medicion cero temporal: conservar ultima medida positiva o estimate.
- Excepcion de `renderItem`: sigue el error flow normal de Ajo.
- Abort: controller, listeners, observers, timers, rAF y refs quedan inertes.
- Cambiar membership, orden o keys in-place viola el snapshot contract. Length
  o edge key inconsistentes lanzan de forma sincronica; un reorder interior que
  evade esos probes sigue siendo error del caller y no se garantiza detectar
  sin una nueva referencia.

## Performance contract

La Interface promete comportamiento observable, no una cifra de marketing:

- DOM: O(visible + overscan + focused pins).
- Rango single-lane steady-state, con metadata limpia: O(log n + rendered).
- Tras invalidar options, measures o data, el core puede reconstruir desde el
  primer indice pendiente y pagar O(n); nunca se vende ese caso como O(log n).
- Cambio de snapshot: puede ser O(n) para validar keys y reconstruir metadata.
- Measurement cache/layout metadata: O(n).
- Cero scans de todos los DOM rows durante scroll.
- Cero `getBoundingClientRect()` por row en el scroll hot path.
- Como maximo un render Ajo coalescido por frame cuando range o geometria
  observable cambian; nunca uno por pixel de scroll.
- Un scroll puro con range, total y offsets sin cambios no vuelve a ejecutar
  `renderItem`. Una medicion o data update puede hacerlo aun con el mismo range;
  los benchmarks deciden si writes directos idempotentes justifican su costo.
- Reads de geometry antes de writes.
- Listener de scroll pasivo.
- Correcciones de offset idempotentes y con epsilon para subpixels.
- Bundle delta cero cuando `VirtualList` no se importa, demostrado tanto por
  subpath como por root barrel; es un exit gate, no una propiedad asumida del
  metadata actual del package.

### Budgets de aceptacion

Cada resultado registra CPU, RAM, OS, browser/version, display scale, build de
produccion, dataset y script. Se hacen 3 warmups y al menos 10 corridas; se
reportan mediana y p95, no el mejor run. Estos son gates iniciales:

- import aislado de `ajo-ui/virtual-list`: <= 9 KiB gzip incremental, incluyendo
  core, adapter y componente;
- 100,000 filas fixed-size: DOM nunca mayor que ventana + overscan + sizer +
  focus pins;
- 10,000 filas de altura variable: ningun scan O(n DOM) en scroll;
- append, prepend, reorder y replace de un snapshot de 100,000 items se trazan
  por separado; ningun update puede ocultar un long task > 50 ms;
- content-only update con misma secuencia de keys y resize storms se trazan por
  separado de structural updates;
- measurement-anchor drift despues de settle: <= 1 CSS px;
- `scrollTo` despues de settle: error <= 1 CSS px;
- ningun long task > 50 ms provocado por un frame de scroll en las fixtures
  objetivo;
- no blank frame: en cada `requestAnimationFrame` del trace, la union de
  intervalos geometricos de items montados cubre el viewport visible salvo el
  final logico real; una falla guarda screenshot y trace;
- no crecimiento de listeners, observers o cached elements despues de mount /
  unmount repetido.

El gate de tree-shaking construye tres apps minimas: una que usa otros subpaths
sin `VirtualList`, una que importa el root de `ajo-ui` sin usarla y una que si la
usa. Las dos primeras deben tener delta cero; la tercera debe quedar dentro del
budget.

El budget de 9 KiB es plausible con el core medido alrededor de 6.4-6.5 kB
gzip, pero no se declara cumplido hasta bundlear el entry real del monorepo y
registrar comando, version de minifier, tarball integrity y opciones.

El gate implementado se ejecuta con:

```sh
pnpm test:bundle
```

Usa Vite `8.0.16`, minificacion esbuild, target ES2022 y externaliza solamente
el framework Ajo que ya pertenece a la app. El resultado actual es `6627` bytes
gzip para Virtual Core aislado, `9359` bytes gzip para el entry completo y
`9209` bytes gzip incrementales sobre el shell Ajo de `150` bytes. El root
barrel seleccionando Accordion es byte-identico al subpath y no contiene el
marker privado de VirtualList. `sideEffects:false` en `ajo-ui` es parte del
contrato de packaging que hace verificable ese delta cero.

## Plan detallado de referencia

Las fases siguientes conservan los exit gates que definen la feature y sirven
para upgrades del engine. El estado operativo actual esta resumido arriba y en
`ai/plan.md`; esta seccion no es un backlog historico.

Este plan es el primer bloque del roadmap combinado. Las Phases 0 a 8 de
`VirtualList` se completan antes de abrir la Implementation de `DataTable` de
`ai/tables.md`. "Completar" significa que el adapter privado, el scroll recipe
y los contract tests estan disponibles; no exige implementar primero las
integraciones opcionales de Phase 9.

### Phase 0: baseline y fixtures

1. Agregar una story de control con `ScrollArea` y DOM completo.
2. Agregar variantes de 100k fixed rows y 10k dynamic rows sin publicar
   componente aun.
3. Medir mount, DOM count, render count, scripting/layout por scroll y bundle
   actual.
4. Incluir tres costos de row: texto simple, card mediana, subtree interactivo.
5. Registrar el crossover de DOM normal, `content-visibility:auto` y prototype
   virtual.

Exit gate: baseline reproducible y sin conclusiones basadas solo en FPS visual.

### Phase 1: adapter interno TanStack

1. Agregar `@tanstack/virtual-core` con version exacta a `ajo-ui`.
2. Crear `packages/ajo-ui/src/virtual.ts` sin export de package.
3. Adaptar element scrolling vertical con las funciones oficiales.
4. Mantener wrappers estables para `items`, key y estimate; crear una nueva
   secuencia de keys upstream solo ante un cambio estructural real.
5. Conectar mount/update/cleanup a `Host` y `host.signal` mediante un scheduler
   post-commit por microtask, coalescido, generation-aware y abort-safe.
6. Normalizar `onChange` para invalidar Ajo solo ante cambios observables.
7. Enrutar errores asincronos por `host.throw`.
8. Implementar SSR-inert y activacion post-first-client-pass.
9. Proveer la policy de measurement que no cachea ceros transitorios.
10. Habilitar `useScrollendEvent` solo por feature detection y conservar el
    fallback upstream.
11. Escribir contract tests del adapter sin afirmar internals upstream.
12. Con el prototype medido, cerrar defaults de `overscan`/`prerender` y la
    shape publica antes de comenzar Phase 2.

Exit gates:

- mount/unmount repetido sin leaks;
- range correcto con fixed y dynamic sizes;
- orden post-commit probado: DOM y refs antes de `_willUpdate()`, sin flash en
  el primer frame ni callbacks despues de abort;
- hidden/zero -> visible conserva una medida util y vuelve a medir;
- SSR sin evaluar target DOM;
- bundle prototype dentro del budget;
- ningun tipo TanStack aparece en declaraciones publicas.

### Phase 2: `VirtualList<T, Key>` base

1. Crear el Stateful `ul` owner del viewport con `tabindex=0` y todos los
   estilos funcionales base; Playa no debe ser necesario para que funcione.
2. Definir los tipos publicos exactamente una vez, con `role` fijo, target por
   key o index y controller sin invalidaciones manuales.
3. Validar snapshot, keys, estimates y numeric options antes de estado parcial.
4. Renderizar `li` keyed solo para el rango materializado y el sizer como ultimo
   hijo neutral.
5. Componer refs del engine sin filtrar measurement details.
6. Estampar slot, `aria-posinset` y `aria-setsize`.
7. Implementar `scrollTo` y `setApi` con identity estable.
8. Implementar focused-key pinning y fallback de foco al remover la key.
9. Agregar TSDoc a cada export publico.
10. Exportar por subpath y root barrel.
11. Agregar surface type tests que prueben inferencia real de `T` y `Key` en
    `<VirtualList items={users}>`; `renderItem`/`getItemKey` deben inferir
    `User` y rechazar campos inexistentes, sin borrarse a `any`.

Exit gate: la shape publica coincide con los surface type tests y no gana
opciones ad hoc durante la implementacion.

### Phase 3: SSR e hydration

1. Producir rango determinista desde `prerender`.
2. Asegurar misma primera ventana server/client.
3. Diferir observacion real hasta despues de la primera pasada cliente.
4. Probar empty, short, exact-fit y long lists.
5. Probar que callbacks SSR no resuelven DOM ni observers.
6. Probar `prerender=0`, default y custom.
7. Probar que SSR no llama `setApi` y que cliente lo llama solo al conectarse.

Exit gate: hydration reutiliza los nodos correctos y no muestra un flash vacio.

### Phase 4: adapter Playa y ScrollArea

1. Extraer el root recipe compartido de `scroll-area.tsx`.
2. Mantener `scrollAreaVariants` para los consumidores internos actuales.
3. Crear `src/ui/virtual-list.tsx` como adapter Stateless.
4. Aplicar axis vertical, scrollbar, gutter, overscroll y focus ring al mismo
   viewport host.
5. Agregar export y type export al catalogo Playa.
6. Agregar stories de empty, simple, variable, interactive y dark theme.

Exit gate: `ScrollArea` no cambia visual ni funcionalmente y `VirtualList` no
crea un scroller anidado.

### Phase 5: correctness y browser behavior

Casos obligatorios:

- append, prepend, delete, reorder y replace con stable keys;
- snapshot nuevo con keys iguales y content-only update con misma referencia;
- duplicate keys;
- cambio de altura por imagen, disclosure y streaming text;
- resize de viewport en ambos ejes;
- width change que reflowea texto;
- hidden -> visible;
- item de altura real cero: se elimina del source, sin fila fantasma;
- scroll lento, rapido, thumb drag, teclado y touch;
- scroll hacia atras con medidas nuevas;
- `scrollTo` cercano/lejos, medido/no medido, cada alignment;
- prefers-reduced-motion;
- item enfocado que sale del range;
- focused key removida;
- missing `ResizeObserver`;
- callbacks tardios de nodos detached;
- repeated mount/unmount/reset;
- history restoration y BFCache;
- zoom/display scale fraccional;
- cambio del scroll element durante lifecycle;
- resize storm y structural update masivo fuera del scroll hot path.

Browsers automatizados: Chromium, Firefox y WebKit.

Gate manual: Safari real en iPhone/iPad; Playwright WebKit en desktop no
reproduce por completo momentum y elastic overscroll de iOS.

### Phase 6: accessibility y UX

1. Verificar semantica `ul`/`li` y nombre accesible.
2. Verificar posiciones y total logicos.
3. Verificar que scrolling con teclado funciona al enfocar el viewport.
4. Verificar que el focused pin no duplica items ni altera orden DOM.
5. QA manual con al menos VoiceOver/Safari y NVDA/Firefox o Chrome.
6. Documentar limites de Tab, AT virtual cursor, find, print y fragments.
7. Publicar decision guide de ScrollArea/content-visibility/VirtualList.

Exit gate: no afirmar accesibilidad completa donde el DOM virtual no puede
ofrecerla.

### Phase 7: performance y package gates

1. Bundlear las tres fixtures de tree-shaking: sin subpath, root sin uso y uso
   real de `VirtualList`.
2. Registrar minified/gzip/brotli y dependencia transitiva.
3. Instrumentar cantidad de `renderItem`, host renders, DOM nodes y observers.
4. Capturar traces de 100k fixed, 10k dynamic, structural/content updates y
   resize storms.
5. Validar placement por `top`, incluyendo stacking/floating descendants.
6. Revalidar los defaults ya cerrados de `overscan` y `prerender` con rows
   simples y pesadas; si fallan, volver a Phase 1/2 antes de publicar.
7. Ejecutar el detector por-frame de blank coverage.
8. Verificar budgets y guardar resultados junto al plan/benchmark relevante.

Exit gate: todos los budgets cumplidos o decision explicita de no publicar.

### Phase 8: documentacion y cierre experimental

1. Actualizar `packages/ajo-ui/README.md`.
2. Actualizar `ai/ui.md` con ownership y contratos implementados.
3. Actualizar el catalogo/story docs.
4. Documentar immutable snapshots, stable keys, state ownership y altura del
   viewport.
5. Documentar el anti-pattern de nesting con ScrollArea.
6. Registrar la version exacta upstream y el procedimiento de upgrade.
7. Ejecutar todos los gates del repo.

Comandos previstos en `D:\ajo-kit`:

```sh
pnpm exec tsc --noEmit
pnpm --filter ajo-ui test
pnpm test:unit
pnpm stories:test --match virtual-list --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
```

### Phase 9: integraciones de familia posteriores

Estas integraciones usan el engine privado, no envuelven el componente
generico:

#### MessageScroller

- pasar a ownership data-driven de mensajes;
- usar `anchorTo:'end'` y follow policy interna;
- traducir `scrollToMessage(id)` por key;
- derivar visibilidad exacta con interseccion O(k) sobre la ventana montada; el
  range del core incluye overscan y no equivale a visible IDs;
- separar live announcements del DOM que se remonta al hacer scroll;
- eliminar scans globales, MutationObserver y compensacion duplicada;
- retirar `content-visibility:auto` y cualquier flex `gap` que duplique o
  contradiga el layout medido;
- probar prepend, streaming content-only, end-follow/escape, reading anchor e
  iOS real antes de reemplazar el engine existente.

#### Select y Command

- materializar la option activa antes de actualizar `aria-activedescendant`;
- navegar sobre el modelo de datos, no solo DOM montado;
- mantener filtering, groups, disabled state y typeahead coherentes.

#### DataTable

- consumir la ventana geometrica del engine privado de `virtual.ts`, no el
  componente publico con semantica `ul/li`;
- exponer la estrategia continua como sibling `VirtualDataTable`, no como
  `virtual`/`mode` dentro de la `DataTable` paginada;
- mantener entries/profiles separados: `DataTable` no importa Virtual Core y
  `VirtualDataTable` no registra pagination;
- usar un unico scroll owner y la misma recipe que `ScrollArea`/`VirtualList`;
- indexar siempre el row model final de TanStack Table con los virtual indexes;
- decidir pagination vs virtualization como UX, no como flag de performance;
- conservar semantica table nativa y headers;
- virtualizar filas sin convertir una tabla en un conjunto de `div`.

Ninguna recibe `virtual={true}` como parche.

## Upgrade policy para TanStack

La dependencia es un detalle reemplazable, pero activo. Reglas:

1. Pin exacto, sin `^` ni `~`.
2. Upgrade manual y separado de features Ajo.
3. Leer release notes y diff de `virtual-core`.
4. Revisar especialmente `_didMount`, `_willUpdate`, measurement,
   scroll correction e iOS state.
5. Ejecutar unit, browser, physical iOS y bundle gates.
6. No exponer una opcion upstream solo porque aparecio.
7. Si el adapter empieza a luchar con el core, comparar reemplazo interno
   contra el mismo contract; no filtrar la instancia.
8. Mientras Ajo siga experimental, adoptar una version mejor puede reescribir
   el adapter y la Interface en un solo corte; no se mantienen dos caminos ni
   capas de migracion.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Dependencia mayor que el propio core Ajo | Import opt-in, tree-shaking verificado, budget <= 9 KiB gzip, cero delta sin import |
| Upstream cambia hooks de adapter | Version exacta, contract tests, upgrade manual |
| Jank con altura dinamica/iOS | Core probado, scrollend/deferral, QA fisica iOS |
| Reorders reutilizan medidas incorrectas | Snapshot inmutable, keys obligatorias, cache por key, duplicate validation |
| Foco desaparece | Focus pin y fallback al viewport cuando se elimina la key |
| Estado de row se pierde | Contrato explicito: state durable fuera de la row; no recycling |
| Screen reader/find no ve todo | Limite documentado; content-visibility o DOM completo cuando domina esa necesidad |
| Defaults sirven solo a fixtures simples | Benchmarks con tres pesos de row; overscan configurable y default medido |
| ScrollArea y VirtualList divergen visualmente | Un frame y un viewport recipe compartidos; sibling components, no nesting |
| MessageScroller duplica geometry owners | No integrarlo hasta poder reemplazar su engine completo |

## Decisiones cerradas

- Owner publico: `ajo-ui`.
- Owner visual: `src/ui`.
- `ajo-cloves`: sin export nuevo.
- External seam: un solo `VirtualList<T, Key>`.
- Implementation inicial: TanStack Virtual Core exacto y oculto.
- Vertical element scrolling solamente en V1.
- Stable keys obligatorias; sin index fallback.
- Items snapshot inmutable.
- Sin DOM recycling entre keys.
- `VirtualList` es el scroll owner y comparte recipe con `ScrollArea`.
- SSR con prerender determinista.
- Focus pinning incluido.
- Placement por `top`; no transform que cambie stacking/containing blocks.
- Accesibilidad limitada documentada honestamente.
- No auto-virtualization ni flags en otras familias.
- Sin retrocompatibilidad: se optimiza el contrato final y se borra cualquier
  experimento reemplazado.
- Orden de roadmap: esta infraestructura se estabiliza antes de `DataTable`.
- Integracion tabular posterior: `VirtualDataTable` sibling reutiliza
  `virtual.ts`; nunca compone el `VirtualList<ul/li>` publico.

## Evidencia cerrada y preguntas futuras

- `overscan=4` y `prerender=20` son los defaults finales de V1.
- El entry real cumple el budget de 9 KiB gzip incremental y el root barrel
  tiene delta cero cuando otra familia es seleccionada.
- La invalidacion Ajo se coalesce y solo re-renderiza ante geometria observable;
  no existen writes directos paralelos dentro del mismo range.
- `scrollTo` usa siempre behavior `auto`; smooth scroll no forma parte de V1.

El crossover exacto contra DOM completo y `content-visibility`, junto con CPU,
RAM, long tasks y hardware movil real, es profiling de adopcion, no una razon
para agregar props. Esa evidencia puede cambiar la guia de eleccion o una
Implementation interna futura, pero no autoriza filtrar opciones TanStack por
la Interface publica.

## Fuentes primarias

### TanStack Virtual

- [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)
- [VirtualItem API](https://tanstack.com/virtual/latest/docs/api/virtual-item)
- [Chat/end anchoring](https://tanstack.com/virtual/latest/docs/chat)
- [Release `@tanstack/virtual-core@3.17.4`](https://github.com/TanStack/virtual/releases/tag/%40tanstack%2Fvirtual-core%403.17.4)
- [Repositorio](https://github.com/TanStack/virtual)
- [Core source fijado a la release](https://github.com/TanStack/virtual/blob/e2cb096862f5b74aa586957eae207b39999cb654/packages/virtual-core/src/index.ts)
- [Adapter Lit oficial fijado a la release](https://github.com/TanStack/virtual/blob/e2cb096862f5b74aa586957eae207b39999cb654/packages/lit-virtual/src/index.ts)
- [Auditoria performance/iOS, mayo 2026](https://tanstack.com/blog/tanstack-virtual-perf-and-ios)

### Otras referencias

- [Virtua](https://github.com/inokawa/virtua)
- [react-window](https://github.com/bvaughn/react-window)
- [React Virtuoso](https://virtuoso.dev/react-virtuoso/)
- [React Virtuoso changelog](https://virtuoso.dev/react-virtuoso/changelog/)
- [Virtuoso Message List](https://virtuoso.dev/message-list/)
- [Virtuoso pricing/licensing](https://virtuoso.dev/pricing/)
- [Vue Virtual Scroller](https://github.com/Akryum/vue-virtual-scroller)
- [Angular CDK scrolling API](https://next.material.angular.dev/docs-content/api-docs/cdk-scrolling)
- [Lit Labs Virtualizer package](https://www.npmjs.com/package/@lit-labs/virtualizer)
- [react-virtualized package](https://www.npmjs.com/package/react-virtualized)

### Plataforma, performance y accesibilidad

- [WICG virtual-scroller status](https://wicg.github.io/virtual-scroller/)
- [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [Resize Observer specification](https://www.w3.org/TR/resize-observer/)
- [Element scrollend](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event)
- [CSS overflow-anchor](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow-anchor)
- [CSS Scroll Anchoring specification](https://www.w3.org/TR/css-scroll-anchoring/)
- [content-visibility](https://web.dev/articles/content-visibility)
- [DOM size and interactivity](https://web.dev/articles/dom-size-and-interactivity)
- [WAI-ARIA Feed pattern](https://www.w3.org/WAI/ARIA/apg/patterns/feed/)
- [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
- [Scrollable listbox example](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-scrollable/)

## Conclusion

La Ajo-way no debe parecer un port de React ni un wrapper generico de TanStack.
Debe sentirse como una pieza que siempre pertenecio al sistema:

```tsx
<VirtualList
	items={items}
	getItemKey={item => item.id}
	estimateSize={64}
	renderItem={item => <Row item={item} />}
/>
```

Detras de esa Interface pequeña quedan data identity, measurement, range,
scroll correction, SSR, focus, ARIA y browser quirks. `ajo-ui` concentra la
semantica; `ajo-cloves` aporta el lifecycle; Playa comparte el idioma visual
de `ScrollArea`; TanStack queda como Implementation sustituible. Esa
distribucion maximiza Depth, Leverage y Locality sin sacrificar el objetivo
micro del caller.
