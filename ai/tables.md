# Tablas de datos dinamicas

Estado: investigacion y plan listo; prerequisite VirtualList implementado

Fecha del snapshot externo: 2026-07-13

Owner de la decision: `D:\ajo-kit`

Este archivo es la fuente canonica local para reemplazar el engine propio de
tablas dinamicas. Debe mantenerse alineado con `ai/ui.md` y con
`ai/vlist.md`.

## Premisas greenfield y orden de implementacion

`ajo` y `ajo-kit` estan en experimentacion, no son publicos y no se usan en
produccion. No hay consumidores externos, contratos publicados ni datos
persistidos cuya forma deba conservarse. Esta investigacion, por lo tanto, no
es una migracion compatible:

- se puede romper o reemplazar la Interface actual de `DataTable`;
- se borran renderers, props, tests, exports e internals que ya no pertenezcan
  al diseno final;
- no se agregan aliases, deprecations, adapters de compatibilidad ni dos
  pipelines publicos/ejecutables;
- el corte puede reescribir `data-table.tsx` completo y sus consumers locales;
- reliability se obtiene con invariants, pins exactos, contract tests, SSR,
  browser QA y benchmarks, no conservando una Implementation inferior;
- mientras Ajo siga experimental, la nueva Interface tambien puede romperse
  si nueva evidencia produce un Module materialmente mejor.

El orden del roadmap es vinculante. Las Phases 0 a 8 de `ai/vlist.md` ya estan
implementadas: `virtual.ts`, el scroll recipe y sus contract/browser/bundle
gates existen. La reescritura tabular puede comenzar con ese unico foundation
privado ya probado, aunque la virtualization tabular se habilite en un slice
propio.

## Decision ejecutiva

La mejor Ajo-way es conservar una sola familia publica, opinionada y
Ajo-native, con dos estrategias explicitas, y reemplazar toda la logica
tabular propia por TanStack Table detras de seams privados:

~~~text
@tanstack/table-core@9.0.0-beta.47
       Implementation fijada y oculta
                    |
                    v
packages/ajo-ui/src/internal/data-table-model.ts
       adapter Ajo v9 privado
                    |
                    v
packages/ajo-ui/src/internal/data-table-renderer.tsx
       markup y policy compartidos
             /                  \
            v                    v
data-table.tsx             virtual-data-table.tsx <--- virtual.ts
DataTable paginada         VirtualDataTable         geometry privada
             \                  /
              v                v
          src/ui/data-table.tsx
          recipe Playa Stateless
~~~

El primitive semantico existente sigue separado:

~~~text
src/ui/table.tsx
       Table/TableHead/TableRow/TableCell...
       composicion manual, estatica y sin engine
~~~

Decisiones concretas:

1. `DataTable` vive en `ajo-ui`. Ese Module es owner de row models, estado,
   markup, accesibilidad, lifecycle y composicion de componentes base.
2. `ajo-cloves` no gana un clove `table` ni una dependencia TanStack. Se
   reutilizan solamente capacidades generales ya existentes, como `Host` y
   `announce`.
3. `@tanstack/table-core` usa deliberadamente la ultima beta v9, resuelta y
   fijada exactamente antes del implementation slice. En este snapshot es
   `9.0.0-beta.47`. No se instala React, Lit ni un adapter de framework.
4. Ningun tipo, instancia, updater, feature, `ColumnDef`, `TableState` ni
   opcion `manual*` de TanStack cruza la Interface publica.
5. El caso actual aporta requirements, no una Interface a preservar. El
   primer profile paginado cubre search, facets, sorting simple, visibility,
   row selection, pagination y empty state con el contrato nuevo.
6. `src/ui/table.tsx` no se reemplaza. Una tabla semantica escrita a mano no
   debe pagar un engine de datos.
7. El engine propio actual se borra en el mismo corte en que entra TanStack.
   No quedan dos pipelines publicos/ejecutables ni compatibility shims.
8. `VirtualList` se implementa primero. `DataTable` reutiliza su engine
   geometrico privado y su scroll recipe, nunca el componente publico
   `ul/li`. Server mode y virtualization tabular se abren solamente con sus
   contratos y pruebas, no mediante passthroughs TanStack.
9. V1 conserva HTML `table` nativo. No usa `role="grid"` ni implementa una
   navegacion de spreadsheet.

La eleccion no es la de menor bundle aislado: el engine propio actual es mas
chico. La eleccion v9 compra row models probados, state atomico, features
opt-in, typing derivado del feature set y una arquitectura de adapters que
encaja con Ajo. Para que siga siendo micro, el costo queda aislado a consumers
reales de `DataTable`, se registran solo las features usadas y se somete a
gates de tree-shaking, bundle y runtime.

## Problema que resolvemos

Una data table no es solamente una tabla HTML. En cuanto combina filtros,
orden, columnas ocultables, seleccion y paginas, aparecen dependencias entre
estados:

- filtrar cambia el universo que puede ordenarse y paginarse;
- ordenar no debe destruir identidad ni seleccion;
- cambiar el page size debe corregir el page index;
- ocultar una columna no debe cambiar el valor que usa un filtro;
- seleccionar una pagina no equivale a seleccionar todos los resultados;
- una actualizacion de rows debe reconciliar keys, pagina y columnas;
- una remote page no puede ordenarse localmente fingiendo ser el universo
  completo;
- cada recalculo debe invalidar solamente los row models que dependen de el.

La Implementation actual resuelve estos casos localmente. Eso parece pequeno
en cada helper, pero en conjunto forma un engine tabular que el proyecto debe
mantener, perfilar y hacer evolucionar. El objetivo es retirar ese engine sin
convertir TanStack en el lenguaje publico de Ajo.

## Inventario local

### Engine dinamico actual

`packages/ajo-ui/src/data-table.tsx` tiene 841 lineas y concentra:

- construccion e identidad de rows;
- lectura y normalizacion de valores;
- search global;
- filters por facets;
- comparacion y sorting;
- visibility;
- row selection;
- pagination;
- labels y announcements;
- aproximadamente 34 class hooks;
- 14 renderer hooks para el Adapter de tema.

El pipeline actual usa operaciones `map/filter/sort/slice` propias. Cambios de
estado que no afectan datos pueden volver a ejecutar trabajo de datos porque no
existe un grafo de row models memoizado equivalente al de TanStack.

El fallback opcional de row ID basado en index es inseguro frente a reorder,
filtering, refresh y selection. La nueva Interface lo elimina.

### Adapter Playa actual

`src/ui/data-table.tsx` tiene 240 lineas. Su mayor costo accidental no es
styling: replica los renderers base para reconstruir table, toolbar, controls,
checkboxes y pagination con componentes Playa.

El seam de tema es demasiado ancho. Un tema no deberia poder cambiar el
pipeline, la semantica de tags o el ownership de estado.

### Primitive semantico

`src/ui/table.tsx` contiene `Table`, `TableHeader`, `TableBody`,
`TableFooter`, `TableRow`, `TableHead`, `TableCell` y `TableCaption`.

Es un primitive Stateless para tablas manuales. No posee data, state ni row
models. Es correcto y debe permanecer.

La distincion canonica queda asi:

| Module | Uso | Engine |
|---|---|---|
| `Table` | markup tabular escrito por el caller | ninguno |
| `DataTable` | coleccion con search/sort/filter/select/page | TanStack privado |

### Consumers

El unico consumer funcional de `DataTable` es
`tests/stories/data-table.stories.tsx`. Los contratos adicionales estan en:

- `tests/root-contracts.types.tsx`;
- `tests/unit/ssr-root-forwarding.test.ts`;
- `tests/unit/ssr-roots.test.ts`.

Las pantallas productivas inspeccionadas usan el primitive `Table` y
paginacion de route. No existe hoy un consumer productivo que obligue a
mantener compatibilidad con la Interface dinamica.

Esto habilita un corte limpio: definir la Interface final, migrar la story y
borrar la Implementation vieja sin aliases ni deprecations.

### Paginacion de servidor existente

`src/data/pagination.ts` trabaja con:

- page one-based;
- size entero positivo;
- offset;
- lectura de `size + 1`;
- flags `back` y `more`;
- URLs previous/next;
- ningun total obligatorio.

Este modelo importa para un futuro server mode. Una API que exija `rowCount`
no representa el sistema actual. Tampoco debe confiar en
`table.getCanNextPage()` cuando TanStack recibe page count desconocido: la
fuente de verdad local para avanzar es `more`.

## Objetivos

- Eliminar el row-model engine propio de `ajo-ui`.
- Dar al caller comun una Interface menor que la actual.
- Mantener TanStack enteramente reemplazable.
- Adoptar de lleno el modelo v9 de feature registry y state atomico, sin una
  capa conceptual v8 ni compatibilidad con el engine retirado.
- Requerir identidad estable y verificable de rows y columns.
- Conservar native table semantics y SSR determinista.
- Componer Checkbox, Menu, Select y Toolbar base, mas input/button nativos.
- Reducir el Adapter Playa a styling y recipes.
- Evitar row-model work ante selection y evitar recomputar filter/sort cuando
  cambia solamente page.
- Mantener el DOM acotado por page size en el caso comun.
- Aislar el bundle de TanStack a consumers reales de `DataTable`.
- Reutilizar el foundation privado de `VirtualList` para cualquier ventana
  tabular, sin duplicar geometry, observers ni scroll ownership.
- Dejar un seam coherente para server data y virtual rows sin filtrar opciones
  upstream antes de tener evidencia.

## No objetivos de V1

- Exponer la API headless de TanStack.
- Grouping, aggregation o pivot tables.
- Tree rows o expansion.
- Column pinning, ordering, resizing o drag and drop.
- Editing de cells.
- Multi-sort.
- Fuzzy search, ranking o `match-sorter`.
- Server fetching dentro de `DataTable`.
- Infinite loading.
- Row virtualization dentro de `DataTable` paginada o mediante un flag.
- Column virtualization.
- Spreadsheet keyboard model.
- `role="grid"`.
- Compatibilidad con la Interface dinamica anterior.
- Compatibilidad con TanStack Table v8 o un camino dual v8/v9.
- Un nuevo clove publico.

Cada item excluido requiere un consumer, un contrato y un slice propio. No
debe entrar como passthrough de una opcion TanStack.

## Realidad de la plataforma

### Table y grid no son sinonimos

Una `table` nativa presenta informacion tabular. Sus links, buttons, inputs y
checkboxes permanecen en el orden de tab normal.

Un ARIA `grid` es un widget composite. Hace que el autor sea responsable de
focus management, arrow navigation, Home/End y de asegurar que el contenido
interactivo siga siendo alcanzable.

Sorting, filtering o selection no convierten automaticamente una table en
grid. V1 conserva `table`.

### Markup nativo primero

El esqueleto final debe ser reconocible sin ARIA correctivo:

~~~html
<div data-slot="data-table">
  <div role="toolbar" aria-label="Payments controls">...</div>
  <div data-slot="data-table-container">
    <table aria-label="Payments">
      <thead>
        <tr>
          <th scope="col" aria-sort="ascending">
            <button type="button">Email</button>
          </th>
        </tr>
      </thead>
      <tbody>...</tbody>
    </table>
  </div>
  <nav aria-label="Payments pagination">...</nav>
</div>
~~~

`aria-sort` aparece solamente en el header actualmente ordenado. El button
dentro del `th` ejecuta la accion. Los iconos decorativos quedan
`aria-hidden="true"`.

### Pagination y virtualizacion resuelven costos distintos

Pagination limita el row model final y el DOM, pero filtering y sorting
anteriores todavia recorren el dataset completo. Virtualizacion limita DOM,
pero tambien sigue procesando el conjunto logico que recibe el table engine.

Para una table cliente comun, pagination es el default mas simple, accesible y
predecible. Virtualizacion se justifica solamente cuando el caso medido exige
scroll continuo o demasiadas rows visibles.

## Research de librerias y frameworks

Snapshot observado al 2026-07-13:

| Proyecto | Modelo | Licencia/stack | Fit con Ajo |
|---|---|---|---|
| TanStack Table v9 beta | headless, features opt-in + atom/store state | MIT, core framework-agnostic | dependencia elegida |
| TanStack Table v8 | headless row models monoliticos | MIT, estable | baseline historico, no candidato |
| AG Grid | grid completo con modules | Community + Enterprise | demasiado ownership |
| Handsontable | spreadsheet completo | licencia comercial/no comercial | problema distinto |
| Tabulator | widget DOM con Virtual DOM | MIT | duplica renderer y UI |
| Grid.js | componente de grid | MIT, depende de Preact | duplica framework |

### TanStack Table

TanStack Table no impone markup ni estilos. Su core modela columns, rows y
state, y ofrece row models encadenados. Esto coincide con la frontera que Ajo
necesita:

- TanStack absorbe algoritmos y memoization;
- Ajo conserva lifecycle, Children, Events y error propagation;
- `ajo-ui` conserva policy, markup y accesibilidad;
- Playa conserva styling.

La ausencia de markup no significa que la libreria resuelva accesibilidad.
Esa responsabilidad queda deliberadamente en `DataTable`.

### AG Grid

AG Grid es una plataforma de grid completa. Sus modules reducen features
incluidas, pero el producto sigue siendo owner del DOM, interaction model,
virtualization, theme y una superficie extensa. Enterprise agrega features
comerciales.

Es una buena referencia para workloads de analytics, grouping, editing y
spreadsheet behavior. No es una buena dependencia para el Module pequeno que
el repo necesita.

### Handsontable

Handsontable optimiza el caso spreadsheet: editing, formulas, fill handles,
copy/paste y una licencia especifica. Adoptarlo para search/sort/page haria que
Ajo pague y modele un producto diferente.

### Tabulator

Tabulator incluye rendering, Virtual DOM, layout, events y UI. Reemplazaria la
capa de componentes en lugar de integrarse debajo de ella.

### Grid.js

Grid.js es pequeno comparado con grids enterprise, pero es un componente UI y
trae Preact. No ofrece la separacion limpia de engine y renderer que necesita
el stack.

### Conclusion del landscape

TanStack Table es la unica opcion evaluada que mejora el engine sin competir
con Ajo por el DOM, la semantica o el tema. Las otras librerias siguen siendo
referencias de features, no dependencias candidatas.

## Decision de version: TanStack Table v9 beta

### Snapshot verificable

Al 2026-07-13, los dist-tags oficiales de `@tanstack/table-core` son:

- `latest`: `8.21.3`;
- `beta`: `9.0.0-beta.47`;
- `alpha`: `9.0.0-alpha.54`.

La beta elegida fue publicada/modificada el 2026-07-13 y declara:

- `@tanstack/store: ^0.11.0` como unica runtime dependency;
- Node `>=20` para tooling/consumption;
- `sideEffects:false`;
- licencia MIT;
- integrity
  `sha512-KhOa5XxkhhMDVs6zMu6N8U8ex2XgeUZUjEB7Kv3CdhCuyf7mh34gT3JcNVEOaOh8l/sSM1hLbz4+DzdWoaj3yQ==`.

El `@tanstack/store@0.11.0` efectivamente resuelto declara integrity
`sha512-WlzzCt3xi0G6pCAJu1U+2jiECwabETDpQDi3hfkFZvJii9AuZqEKbOiVarX1/bWhTNjU486yQtJCCasi/0q+Cw==`.

El pin del snapshot es:

~~~json
{
  "dependencies": {
    "@tanstack/table-core": "9.0.0-beta.47"
  },
  "pnpm": {
    "overrides": {
      "@tanstack/store": "0.11.0"
    }
  }
}
~~~

El tag `beta` se vuelve a resolver inmediatamente antes de implementar. Se
instala el numero exacto resultante, nunca `@beta`, `^` ni `~`; lockfile,
tarball integrity, Node version y metafile quedan registrados en el artifact
del slice.

### Por que v9 es la Ajo-way

V8 sigue siendo el release marcado `latest`, pero no es la Implementation
candidata. Ajo no tiene riesgo productivo ni costo de migracion que justifique
construir primero sobre una arquitectura que ya sabemos reemplazar. V9 ofrece:

- features y row-model factories explicitamente registradas;
- tipos de table, row, column, options y state derivados del feature set;
- state slices atom-backed mediante TanStack Store;
- core row model automatico y row models opcionales por slot;
- APIs compartidas por prototype para rows/cells/columns;
- un contrato de adapter claro: `constructTable`, bindings reactivos,
  subscription, `setOptions` y cleanup;
- una frontera privada capaz de absorber breaking betas sin contaminar Ajo.

La reliability requerida no significa "usar la version estable mas vieja".
Significa pin exacto, source audit, contract tests Ajo, parity de row models,
SSR, lifecycle abort-safe, browsers, bundle y runtime gates. Si una beta rompe
esos gates, se corrige el adapter o se fija temporalmente la beta anterior; no
se abre un pipeline v8 paralelo.

### Adapter de framework

No se instala `@tanstack/lit-table`. Su `TableController` beta es una referencia
primaria util porque demuestra el lifecycle no-React: construye una instancia,
actualiza options, subscribe a Store y limpia al desconectarse. Ajo implementa
ese bridge en menos superficie y con su propio `Host`.

Tampoco se implementa un engine atomico propio. `ajoTableReactivity(host)`
parte de `storeReactivityBindings()` y cambia solamente policy de adapter:

- `createOptionsStore:false`, porque los args vivos ya reentran por cada yield;
- scheduler de microtask abort-safe que enruta errores por `host.throw`;
- `wrapExternalAtoms:false`; Ajo no publica atoms TanStack;
- una subscription al `table.store` para invalidar el Host;
- unsubscribe por `host.signal`.

Esto conserva el Store probado de v9 y evita Lit, un options store redundante y
un segundo sistema reactivo inventado localmente.

## Medicion de bundle

Se hicieron fixtures diagnosticos en un directorio temporal, fuera del repo:

- package tarballs exactos obtenidos del registry;
- esbuild `0.28.1`;
- target browser, format ESM, minified;
- gzip level 9;
- Brotli quality 11;
- imports Ajo externos en el fixture de la base actual.

Resultados:

| Fixture | Minified | gzip | Brotli |
|---|---:|---:|---:|
| engine Ajo actual, base aislada | 13,324 B | 4,915 B | 4,481 B |
| entry Playa actual, incluye shared UI | 52,688 B | 16,806 B | 14,931 B |
| TanStack v8, core + filter + sort + page, baseline historico | 53,189 B | 14,073 B | 12,685 B |
| TanStack v9 beta, features sin binding, diagnostico incompleto | 47,354 B | 13,172 B | 11,858 B |
| **v9 beta.47 + Store + feature profile + bridge Ajo elegido** | **52,694 B** | **15,036 B** | **13,554 B** |

Estas cifras no son un bundle final de la aplicacion:

- el entry Playa incluye components compartidos y no se compara directamente
  con `table-core`;
- la ultima fila si incluye `store-reactivity-bindings`, `@tanstack/store`, el
  feature registry elegido, subscription/cleanup y scheduler abort-safe;
- minifier, target y graph del consumer cambian el resultado;
- borrar el engine actual recupera parte del delta.

La conclusion honesta es mas importante que un numero aislado:

- v8 permanece solamente como baseline; su menor gzip no cambia la decision
  greenfield de arquitectura;
- el engine propio es aproximadamente 4.9 KiB gzip aislado;
- TanStack no es la opcion de menor byte count;
- el graph v9 elegido ocupa 15,036 B gzip, o 14.68 KiB, y queda 324 B por debajo
  del threshold candidato de 15 KiB binarios (`15,360 B`); esto todavia no
  declara pasado el gate porque el fixture temporal no es un artifact
  reproducible del repo;
- el hash SHA-256 del output medido es
  `c5eb05a78894d086df93350b45bbe675cb23e8397acf3ec3590f24f5587269b0`;
- "micro" debe significar Interface y inclusion opt-in, no fingir que la
  dependencia es diminuta.

El entry diagnostico mas completo registra solamente:

- `columnFilteringFeature` + `globalFilteringFeature`;
- `columnVisibilityFeature`;
- `rowSortingFeature` + `createSortedRowModel()`;
- `rowSelectionFeature`;
- `rowPaginationFeature` + `createPaginatedRowModel()`;
- `createFilteredRowModel()`;
- core row model automatico de v9;
- Store oficial y policy de lifecycle Ajo.

No usa `stockFeatures`, `columnFacetingFeature`, Lit, worker, fuzzy matching ni
features futuras. El source, command, lock y metafile de esta corrida temporal
no se conservaron; el hash identifica ese output, pero no permite reproducirlo.
Por eso informa la arquitectura y el threshold, no es evidencia de aceptacion.
Phase 0 repite el fixture con la beta exacta resuelta ese dia, el entry real del
monorepo, source y command versionados, lock/integrities, metafile y hashes. Un
aumento no habilita v8: obliga a perfilar imports, simplificar el adapter o
revisar el budget de forma explicita con delta neto despues de borrar el engine
actual.

## Design it twice: Interfaces comparadas

Se compararon tres diseños radicalmente distintos y el status quo.

### A. TanStack publico

~~~tsx
const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
})

const table = constructTable({
	features,
	data,
	columns,
})

table.getHeaderGroups()
table.getRowModel().rows
~~~

Ventajas:

- maxima capacidad;
- ejemplos oficiales aplican casi literalmente;
- features nuevas no requieren trabajo en Ajo.

Costos:

- el caller aprende `ColumnDef`, row models, updaters y state slices;
- TanStack pasa a ser parte de la Interface de Ajo;
- cada breaking beta obliga a reescribir aplicaciones en vez de un solo seam;
- cada consumer puede romper markup y accesibilidad de forma diferente;
- `ajo-ui` aporta poco Leverage.

Veredicto: no.

### B. Clove headless

~~~tsx
const table = tableModel({
	rows,
	columns,
	sort,
	filter,
})

<Table>
	{table.rows.map(...)}
</Table>
~~~

Ventajas:

- engine reutilizable con renderers distintos;
- parece coherente con otras primitivas headless.

Costos:

- sorting, pagination, columns y facets no son conducta general de DOM;
- no hay un segundo renderer real;
- introduce TanStack en una capa consumida por todos los componentes;
- duplica el concepto de selection;
- deja markup y accesibilidad fragmentados entre callers.

Veredicto: no. Viola la regla local "no consumer, no clove".

### C. Engine propio reducido

~~~tsx
<DataTable rows={rows} columns={columns} />
~~~

Ventajas:

- menor bundle actual;
- control total;
- ningun third party.

Costos:

- Ajo sigue manteniendo invalidation, row models y edge cases;
- el costo crece con cada feature;
- performance y correctness dependen de una Implementation local unica;
- grouping, remote state o virtualization tentarian a sumar mas engine.

Veredicto: no como direccion. Es el status quo que se quiere retirar.

### D. Module profundo sobre core privado

~~~tsx
<DataTable
	label="Payments"
	rows={payments}
	getRowKey={payment => payment.id}
	columns={columns}
	search={{ placeholder: 'Filter payments...' }}
	selection={{ getRowLabel: payment => payment.email }}
/>
~~~

Ventajas:

- caller Ajo-native y pequeno;
- TanStack reemplazable;
- una sola politica de markup, state y accesibilidad;
- theme adapter estrecho;
- high Leverage sobre un caso real.

Costos:

- aproximadamente 9.9 KiB gzip adicionales frente al engine base aislado en
  los fixtures diagnosticos, antes de medir el delta neto del entry real;
- features no previstas requieren diseno Ajo, no un passthrough;
- `ajo-ui` debe mantener un Adapter preciso.

Veredicto: si.

### Comparacion

| Opcion | Interface pequena | TanStack privado | A11y central | Bundle opt-in | Evolucion segura |
|---|---:|---:|---:|---:|---:|
| TanStack publico | no | no | no | si | no |
| clove headless | media | si | no | dudoso | media |
| engine propio | si | n/a | si | si | no |
| DataTable profundo | si | si | si | si | si |

La factory headless flexible es util como modelo mental para
`internal/data-table-model.ts`. No debe exportarse. Si en el futuro aparece un
segundo renderer real que no puede usar `DataTable`, se evalua un nuevo Module
con evidencia.

## Placement definitivo

### `ajo-ui`

Es owner de:

- Interface `DataTable`;
- column schema Ajo;
- state policy;
- Adapter TanStack;
- native table markup;
- accessible names y announcements;
- composicion de componentes base;
- SSR y lifecycle;
- errors e invariants.

Archivos objetivo:

~~~text
packages/ajo-ui/
  package.json
  src/
    internal/
      data-table-contract.ts   tipos y vocabulario privados
      data-table-model.ts      Adapter TanStack v9 privado
      data-table-renderer.tsx  markup/policy privado compartido
    data-table.tsx             strategy paginada publica
    virtual-data-table.tsx     strategy virtual publica tras sus gates
    virtual.ts                 engine geometrico privado ya implementado
    index.ts                   exports Ajo, nunca TanStack
~~~

Los tres primeros archivos son source-internal. No forman un framework
headless ni subpaths publicos: existen para profundizar una sola familia. Los
dos entrypoints publicos eligen profiles estaticos distintos, de modo que la
tabla paginada no arrastre virtual-core y la virtual no arrastre pagination.

Hoy `packages/ajo-ui/package.json` publica `./* -> ./src/*.tsx`. Ese wildcard
haria importable cualquier helper TSX, incluso bajo un directorio llamado
`internal`. En el corte greenfield se reemplaza por un export map explicito de
los subpaths publicos reales. `data-table`, `virtual-data-table` y el root barrel
son los unicos caminos de esta familia; contract/model/renderer no resuelven
desde package imports. Negative resolution/type tests protegen el seam. No se
conserva el wildcard por compatibilidad.

### `ajo-cloves`

No agrega archivos ni exports de table.

`DataTable` puede consumir:

- `Host` y abort signal;
- `announce`;
- helpers generales de controlled state si conservan una sola autoridad.

Deja de consumir el clove `selection` para rows. TanStack es la unica
representacion interna: su slice es autoridad en uncontrolled mode y proyecta
el `value` del caller en controlled mode. No existe un Set/clove paralelo. El
clove existente sigue siendo correcto para CheckboxGroup y ToggleGroup.

### `src/ui`

`src/ui/data-table.tsx` queda como Adapter Playa Stateless:

- aplica una recipe al root y a `data-slot` descendants;
- comparte estilos semanticos con `src/ui/table.tsx`;
- no posee state;
- no conoce TanStack;
- no reemplaza row models;
- no recibe 14 renderers.

`src/ui/table.tsx` permanece separado y sin dependencia de DataTable.

## Interface publica propuesta

La Interface final usa el vocabulario de la coleccion y no el de TanStack.
La strategy paginada publica solamente `DataTable`, `DataTableColumn<T>` y
`DataTableArgs<T, Key>`. Si supera sus gates, la strategy virtual agrega
`VirtualDataTable` y `VirtualDataTableArgs<T, Key>`; reutiliza
`DataTableColumn`. Los tipos auxiliares siguientes aparecen en la declaracion
estructural pero no son imports publicos independientes.

~~~ts
import type { Children, IntrinsicElements } from 'ajo'
import type { FixedArgs, OmitArg } from './utils'

type DataTableKey = number | string

type DataTableScalar =
	| boolean
	| number
	| string
	| null
	| undefined

type DataTableCellContext = {
	columnId: string
	sourceIndex: number
	value: unknown
}

type DataTableFacet<T> = {
	label: string
	options: readonly {
		icon?: Children
		label: string
		value: string
	}[]

	/**
	 * Defaults to the column value converted to its canonical string.
	 * Use this for arrays, tags or values that are not scalar.
	 */
	values?: (
		row: T,
		sourceIndex: number,
	) => string | readonly string[]
}

type DataTableColumnBase = {
	/** Plain accessible name used by menus, sort and announcements. */
	label: string

	/** Visual header; defaults to label. */
	header?: Children

	align?: 'center' | 'left' | 'right'
	defaultHidden?: boolean
	hideable?: boolean
}

type DataTableValue<T> =
	| {
		/** Defaults column ID to this property key. */
		id?: string
		value: keyof T & string
	}
	| {
		/** Required because a function has no stable derived identity. */
		id: string
		value: (
			row: T,
			sourceIndex: number,
		) => unknown
	}

type DataTableValueColumn<T> =
	DataTableColumnBase & DataTableValue<T> & {
	cell?: (
		row: T,
		context: DataTableCellContext,
	) => Children
	sort?: false | ((left: T, right: T) => number)
	search?: false | ((
		row: T,
		sourceIndex: number,
	) => DataTableScalar)
	facet?: DataTableFacet<T>
}

type DataTableDisplayColumn<T> = DataTableColumnBase & {
	id: string
	value?: never
	cell: (
		row: T,
		context: DataTableCellContext,
	) => Children
	sort?: false
	search?: false
	facet?: never
}

export type DataTableColumn<T> =
	| DataTableDisplayColumn<T>
	| DataTableValueColumn<T>

type DataTableSelectionBase<T> = {
	getRowLabel: (row: T, sourceIndex: number) => string
}

type DataTableSelectionChange<Key extends DataTableKey> = (
	keys: readonly Key[],
	event?: Event,
) => void

type DataTableSelection<
	T,
	Key extends DataTableKey = DataTableKey,
> = DataTableSelectionBase<T> & (
	| {
		value: readonly Key[]
		defaultValue?: readonly Key[]
		onValueChange: DataTableSelectionChange<Key>
	}
	| {
		value?: undefined
		defaultValue?: readonly Key[]
		onValueChange?: DataTableSelectionChange<Key>
	}
)

type DataTablePagination = {
	defaultSize?: number
	sizes?: readonly number[]
}

type DataTableSortName = 'ascending' | 'descending' | 'none'

type DataTableCommonLabels = {
	columns: string
	deselectResults: string
	deselectRow: (rowLabel: string) => string
	reset: string
	results: (count: number) => string
	search: string
	selectResults: string
	selectRow: (rowLabel: string) => string
	selected: (selected: number, sourceTotal: number) => string
	sort: (columnLabel: string, next: DataTableSortName) => string
	toolbar: (tableLabel: string) => string
}

type DataTablePaginationLabels = {
	deselectPage: string
	firstPage: string
	lastPage: string
	nextPage: string
	page: (page: number, pages: number) => string
	pagination: (tableLabel: string) => string
	previousPage: string
	rowsPerPage: string
	selectPage: string
}

type DataTableVirtualLabels = {
	viewport: (tableLabel: string) => string
}

export type DataTableArgs<
	T,
	Key extends DataTableKey = DataTableKey,
> = OmitArg<
	IntrinsicElements['div'],
	'aria-label' | 'aria-labelledby' | 'children' | 'data-slot'
> & FixedArgs<
	'aria-label'
	| 'aria-labelledby'
	| 'attr:aria-label'
	| 'attr:aria-labelledby'
	| 'attr:data-slot'
	| 'children'
	| 'data-slot'
	| 'set:ariaLabel'
	| 'set:ariaLabelledByElements'
> & {
	/** Plain accessible name applied to the native table element. */
	label: string

	/** Immutable ordered logical collection. */
	rows: readonly T[]

	/** Stable unique identity across filter, sort, page and refresh. */
	getRowKey: (row: T, sourceIndex: number) => Key

	/** Immutable column schema with stable IDs. */
	columns: readonly DataTableColumn<T>[]

	search?: {
		placeholder?: string
	}

	/** Presence enables row selection; omission disables it. */
	selection?: DataTableSelection<T, Key>

	pagination?: false | DataTablePagination

	empty?: Children
	labels?: Partial<DataTableCommonLabels & DataTablePaginationLabels>
	children?: never
}
~~~

Los label maps cambian copy, no estructura. Sus functions reciben solamente los
datos necesarios para producir texto; no son render hooks. La estrategia
paginada y la virtual comparten labels comunes, pero cada una expone solamente
el copy que realmente renderiza.

### Ejemplo comun

~~~tsx
type Payment = {
	id: string
	amount: number
	status: 'failed' | 'pending' | 'processing' | 'success'
	email: string
}

const columns: readonly DataTableColumn<Payment>[] = [
	{
		label: 'Status',
		value: 'status',
		facet: {
			label: 'Status',
			options: [
				{ label: 'Success', value: 'success' },
				{ label: 'Processing', value: 'processing' },
				{ label: 'Pending', value: 'pending' },
				{ label: 'Failed', value: 'failed' },
			],
		},
		cell: payment => (
			<span class="capitalize">{payment.status}</span>
		),
	},
	{
		label: 'Email',
		value: 'email',
		cell: payment => (
			<span class="lowercase">{payment.email}</span>
		),
	},
	{
		label: 'Amount',
		value: 'amount',
		align: 'right',
		cell: payment => money.format(payment.amount),
	},
	{
		id: 'actions',
		label: 'Actions',
		header: <span class="sr-only">Actions</span>,
		hideable: false,
		cell: payment => <PaymentActions payment={payment} />,
	},
]

const getPaymentKey = (payment: Payment) => payment.id
const getPaymentLabel = (payment: Payment) => payment.email

<DataTable
	label="Payments"
	rows={payments}
	getRowKey={getPaymentKey}
	columns={columns}
	search={{ placeholder: 'Filter payments...' }}
	selection={{
		getRowLabel: getPaymentLabel,
		onValueChange: keys => selectedPaymentKeys = keys,
	}}
	pagination={{
		defaultSize: 25,
		sizes: [10, 25, 50],
	}}
/>
~~~

### Decisiones de DX

- `rows` y `getRowKey` describen el dominio Ajo; no copian `data` y
  `getRowId` por familiaridad con TanStack.
- `getRowKey` es obligatorio. No existe fallback al index.
- Key conserva su tipo publico `string | number`. El Adapter codifica
  internamente `s:...` y `n:...` para evitar la colision entre `1` y
  `"1"`.
- Una property column deriva ID de su property key y puede overridearlo.
  Accessor functions y display columns exigen `id`; identidad nunca se deriva
  de header ni del nombre de una function.
- `label` es texto plano y obligatorio. `header` es visual y opcional; menus,
  sort y announcements nunca intentan extraer texto de Children.
- `value` une accessor, sorting, search y facet en una sola definicion.
- Una column sin `value` es de display y exige `cell`.
- `facet` vive junto a la column. Desaparecen referencias paralelas por column
  ID y `DataTableFacet.getValue` externo.
- facet `icon` es Children decorativo/no interactivo y se envuelve
  `aria-hidden`; no transporta una class que el engine interprete.
- `selection` sigue el patron `value/defaultValue/onValueChange`. El callback
  devuelve keys, que siguen siendo correctas aunque un futuro server mode no
  tenga todas las rows cargadas.
- Search es opt-in.
- Pagination es el default. `false` permite renderizar todos los resultados de
  forma explicita.
- Visibility aparece solamente si existe una column cuyo toggle puede cambiar
  el estado.
- No hay `classes`, `renderers`, `instance`, `options` ni escape hatch.

### Defaults candidatos

Los defaults se congelan despues de ejecutar las stories y benchmarks de Phase
0. Los candidatos son:

- page sizes: 10, 25 y 50;
- default size: `defaultSize` explicito o la primera `sizes`, 10 con defaults;
- single-column sorting;
- sort cycle: none, ascending, descending, none;
- value columns sortable por default;
- value columns searchable por default cuando search esta activo;
- value columns hideable por default;
- display columns no sortables ni searchable;
- facet options sin seleccion por default.

Reducir las seis page-size options actuales a tres mejora scan y elimina
valores sin evidencia. Si un consumer real necesita otra size, la declara.

## Contratos de datos e identidad

### Rows como snapshots inmutables

`rows` es un snapshot ordered e inmutable.

- Agregar, quitar, editar o reordenar requiere una nueva referencia.
- Mutar el array o una row sin cambiar referencia viola el contrato.
- TanStack no recibe ownership de los objetos.
- El cast desde `readonly T[]` a la forma interna queda en
  `internal/data-table-model.ts`.

Accessors, search mappers, facet mappers y comparators deben ser puros y
deterministas. Pueden ejecutarse mas de una vez.

Todo parametro `sourceIndex` es la posicion original en el snapshot `rows`,
antes de filter, sort o page. La Interface no expone un index visual ambiguo.

### Row keys

Cada key debe ser:

- string no vacio; o
- number finito.

Keys deben ser unicas en el snapshot completo. `0` y `-0` representan la misma
identidad y no pueden coexistir.

El Adapter valida antes de crear el row model y produce un error que incluye
la key duplicada y sus indexes.

El key map y su validacion se cachean por la identidad conjunta de `rows` y
`getRowKey`. Cambiar solamente page o selection no vuelve a recorrer el
dataset. `getRowKey` forma parte del snapshot y debe conservar referencia
cuando su semantica no cambia.

### Columns como schema

`columns` es un snapshot inmutable.

- El schema contiene al menos una column.
- IDs no vacios y unicos.
- Una nueva referencia permite cambiar schema.
- State se reconcilia por ID, no por index.
- Sorting de una column removida vuelve a none.
- Filters de una column removida se descartan.
- Visibility de IDs sobrevivientes se preserva.
- Una column nueva lee `defaultHidden` una vez.
- Al menos una column declarada queda visible; un schema con todas
  `defaultHidden` es invalido.

Para un ID que sobrevive, tambien se reconcilian capabilities:

- si `sort` pasa a false, sorting de esa column se limpia;
- si `facet` desaparece, su filter se limpia;
- si cambian options de facet, active values se intersectan con las nuevas;
- si `hideable` pasa a false mientras esta hidden, vuelve a visible;
- cambios de value/accessor invalidan su row-model cache;
- cambios de label/header/cell conservan state valido.

Si remover/reconciliar columns deja cero efectivamente visibles, la primera
column declarada en source order vuelve a visible. Esto es una correccion de
state, no un callback.

Una limpieza de sort/filter causada por schema vuelve page a 1 sin callback
publico.

El caller debe conservar la referencia cuando el schema no cambia. El Adapter
cachea la traduccion a `ColumnDef` por referencia.

### Values

El auto-sort, search y facet default aceptan valores escalares:

- string;
- number finito;
- boolean;
- null o undefined.

La normalizacion default es total y explicita:

- string: search por substring lowercase y sort alphanumeric
  case-insensitive de TanStack;
- number: search por representacion decimal y sort numerico;
- boolean: `false` antes de `true` y strings `"false"/"true"` para search;
- null/undefined: string vacio para search/facet y un mismo missing sentinel
  para sort.

El `cell` context conserva el valor crudo aunque la sort key normalice null.

Cuando `cell` se omite, el renderer default produce:

- string/number/bigint/boolean: `String(value)`;
- null/undefined: cell vacia;
- cualquier otro valor: `TypeError` lazy al materializar esa cell.

Para Date, object, array, bigint o tipos mixtos, la column declara los mappers
o comparator correspondientes. No se ejecutan todos los accessors antes de
crear el row model para inferir tipos: una configuracion incompatible falla
cuando ese feature evalua por primera vez la row, con column ID y source
index. La UI nunca ordena por el Children renderizado por `cell`.

Esto separa dato de presentacion:

~~~tsx
{
	id: 'amount',
	value: 'amount',
	cell: row => money.format(row.amount),
}
~~~

Sorting usa el number crudo, no el string monetario.

## Semantica de state

### Pipeline

El orden canonico es:

~~~text
core rows
    -> global search
    -> column facets
    -> single-column sort
    -> pagination
    -> visible cells
~~~

Coincide con el pipeline de row models de TanStack. Visibility no cambia que
valores participan de search o filters; solamente cambia cells renderizadas.

### Search

- substring case-insensitive mediante lowercase JavaScript, sin locale
  implicito;
- trim de whitespace inicial/final;
- sin fuzzy ranking;
- sin diacritic folding implicito;
- combina las columns cuyo `search !== false`;
- un mapper de column reemplaza solamente el valor de esa column.

El input actualiza state inmediatamente. Debounce no es una opcion publica.
Si 10k rows medidos requieren coalescing, se fija una policy interna y se
prueba input latency, IME y Enter.

### Facets

- OR entre options de una misma facet;
- AND entre facets de columns diferentes;
- una option desconocida nunca entra al state;
- reset limpia search y facets;
- una facet sin options no se renderiza.

### Sorting

- una sola column en V1;
- none -> ascending -> descending -> none;
- strings usan el sorter `alphanumeric` de TanStack;
- numbers usan comparacion numerica y booleans `false < true`;
- null y undefined empatan de forma estable; quedan despues de valores
  definidos en ascending y antes en descending por inversion normal;
- comparator custom define orden ascending y TanStack invierte para
  descending;
- sort estable respecto del source order cuando el comparator empata.

Cada ColumnDef Ajo usa `sortUndefined:false` y un comparator privado que trata
`null` y `undefined` juntos. Asi el comparator ve ambos valores, devuelve cero
para dos nullish y aplica la policy anterior antes de delegar al comparator de
number/string/boolean. V9 tambien soporta `'first'`/`'last'`, pero esas options
no cubren `null` y no deben reemplazar una semantica Ajo probada.

### Pagination

- page index interno zero-based;
- copy de UI one-based;
- el size inicial es `defaultSize ?? sizes[0]`;
- `defaultSize` se lee al habilitar pagination y no controla interacciones
  posteriores;
- `sizes` es config live. Si cambia y ya no contiene el size actual, se elige
  `defaultSize` si esta presente o la primera size, y page vuelve a 1;
- cambiar search, facet, sort o page size vuelve a la primera page;
- reemplazar rows conserva page si sigue siendo valida;
- si deja de ser valida, clamp a la ultima page;
- mientras pagination esta habilitada, su estructura permanece montada y los
  buttons imposibles quedan disabled; un filter no desmonta el control que
  tenia foco;
- `pagination={false}` es una decision explicita y puede producir DOM grande.

### Selection

- identity basada unicamente en `getRowKey`;
- persiste a traves de filter, sort y page;
- select-all selecciona o limpia la page actual en `DataTable` paginada;
- sin pagination y en `VirtualDataTable`, select-all opera sobre todos los
  resultados filtrados logicos, nunca solamente las rows montadas;
- labels diferentes dicen "Select page" y "Select filtered results";
- el summary usa selected keys efectivas de todo el source snapshot y el total
  de source rows, aunque filters oculten algunas selecciones;
- internal selection poda keys que ya no existen al reemplazar el snapshot;
- en V1 client, controlled keys ausentes del snapshot no son efectivas ni
  cuentan en el summary; la siguiente interaction emite solamente keys
  presentes, en source order;
- `value` y `defaultValue` no aceptan duplicate keys;
- cuando `value !== undefined`, el caller es la autoridad y cada interaction
  propone el siguiente value por callback;
- un `value` controlado exige `onValueChange` por type; no existe selection
  interactiva controlada read-only;
- `defaultValue` inicializa solamente el fallback uncontrolled. Si ambos estan
  presentes, `value` gana, siguiendo la convencion Ajo existente.

DataTable no devuelve row objects seleccionados. El caller que posee el
snapshot puede resolverlos por key; una API key-first tambien funciona en un
futuro server mode.

### Visibility

- la column menu aparece solamente cuando al menos un toggle puede cambiar el
  estado;
- nunca puede ocultarse la ultima column declarada visible;
- la selection column sintetica no cuenta como column declarada;
- `defaultHidden` se lee al introducir la column;
- visibility no cambia search, facets ni selection.

### Capability transitions

- omitir `selection` la deshabilita y limpia su state interno sin callback;
- volver a proveer `selection` inicializa desde `value` o `defaultValue`;
- omitir `search` limpia el search string, no las facets;
- volver a proveer `search` comienza vacio;
- `pagination={false}` limpia page state;
- volver a habilitar pagination lee `defaultSize` y comienza en page 1.

## Adapter Ajo privado

`internal/data-table-model.ts` concentra toda traduccion de conceptos.

### Responsabilidades

- convertir `DataTableColumn<T>` a `ColumnDef<T, unknown>`;
- codificar row keys para el string ID interno;
- crear una sola table por owner Stateful;
- construir una vez el feature profile v9 exacto;
- dejar que `table.atoms`/`table.store` posean los slices uncontrolled;
- resolver functional updaters del unico slice publicamente controlable;
- llamar `table.setOptions` con args vivos;
- instalar el feature profile elegido; core es automatico en v9;
- fijar single sort, `autoResetPageIndex: false` y resets Ajo explicitos;
- desactivar row range selection y multi-sort no publicados;
- traducir selection y visibility;
- derivar header groups, rows y cells para el renderer Ajo;
- coalescer invalidations hacia `host.next`;
- detener updates cuando `host.signal.aborted`;
- no acceder al DOM durante setup o SSR;
- no entregar callbacks publicos a la queue interna de TanStack.

### Feature profile v9

No se usa `stockFeatures`, registries completos ni `createCoreRowModel()`. El
profile compartido excluye deliberadamente cualquier estrategia de ventana:

~~~ts
const sharedFeatureConfig = {
	columnFilteringFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowSelectionFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
}

const paginatedTableFeatures = tableFeatures({
	...sharedFeatureConfig,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
})

const virtualTableFeatures = tableFeatures({
	...sharedFeatureConfig,
})
~~~

Search, facets y sort usan functions privadas directas en cada `ColumnDef` o
option. No se importan los objetos agregados `filterFns`/`sortFns` porque v9
advierte que incorporan todos los built-ins. `columnFacetingFeature` tampoco
entra: las facets V1 tienen options declaradas y usan column filtering; no
calculan unique values ni counts desde rows.

`coreReactivityFeature` depende del lifecycle del Host y se agrega una sola vez
por instancia, nunca por yield:

~~~ts
const reactivity = ajoTableReactivity(host)
const features = tableFeatures({
	...strategyFeatures,
	coreReactivityFeature: reactivity.bindings,
})
~~~

Aunque el objeto final sea por instancia, los feature modules y row-model
factories permanecen module-scoped y estables. Props opcionales habilitan UI y
policy; no cambian el registry ni reconstruyen la table.

### Reactivity bridge

`ajoTableReactivity(host)` decora `storeReactivityBindings()`; no reimplementa
atoms. Sus diferencias son deliberadas:

- `createOptionsStore:false`: Ajo es owner de options y las sincroniza en cada
  yield; un options atom agregaria una subscription y renders redundantes;
- `schedule(fn)`: microtask abort-safe, con errors enviados a `host.throw`;
- `addSubscription`: registra cada unsubscribe en un Set privado;
- `unmount`: vacia ese Set exactamente una vez;
- `host.signal.abort`: llama `unmount`;
- `wrapExternalAtoms:false`: no existe API publica de atoms TanStack.

La subscription de `table.store` entra por ese mismo owner. El Adapter no llama
el `unmount()` stock que hoy lanza "Feature not supported"; reemplaza esa
funcion en el wrapper y prueba su cleanup. Durante `setOptions` se marca
`syncingOptions` para que la proyeccion controlada no programe un render extra:
el yield actual ya esta produciendo la vista. Las demas emisiones se coalescen
en una microtask y llaman solamente `host.next()`.

### Lifecycle

Forma conceptual v9:

~~~ts
const reactivity = ajoTableReactivity(host)
const features = tableFeatures({
	...strategyFeatures,
	coreReactivityFeature: reactivity.bindings,
})

let args = initialArgs
let syncingOptions = false
let actionEvent: Event | undefined
let stateVersion = 0
let renderedStateVersion = 0

const table = constructTable({
	features,
	...initialOptions(args),
	autoResetPageIndex: false,
	enableMultiSort: false,
	enableRowRangeSelection: false,
})

const updateUncontrolledSelection = table.options.onRowSelectionChange!
reactivity.add(table.store.subscribe(() => {
	const requestedVersion = ++stateVersion
	if (!syncingOptions) invalidateOnce(requestedVersion)
}))

for (const current of host) {
	args = current
	syncingOptions = true
	try {
		table.setOptions(previous => ({
			...previous,
			...liveOptions(args),
			state: controlledSelectionState(args),
			onRowSelectionChange: selectionUpdater({
				args,
				event: () => actionEvent,
				table,
				updateUncontrolledSelection,
			}),
		}))
		reconcileCapabilitiesAndPage(table, args)
	} finally {
		syncingOptions = false
	}

	const view = renderAjoTable(projectAjoModel(table), args)
	renderedStateVersion = stateVersion
	yield view
}
~~~

`invalidateOnce(requestedVersion)` conserva la mayor version solicitada. Su
microtask hace no-op si el signal aborto o si `renderedStateVersion` ya alcanzo
esa version. Asi, si un callback provoca un rerender del owner antes del flush,
la vista nueva consume el state y no queda un segundo render pendiente. Las
emisiones durante `setOptions` tambien incrementan la version, pero el yield en
curso las marca observadas sin agendar trabajo.

Es un sketch de invariants, no codigo para copiar. El codigo final debe probar:

- una sola table y una sola subscription por Host;
- ninguna `TableState` paralela;
- options actuales en cada yield sin recrear features;
- state uncontrolled escrito primero por el updater interno de v9;
- selection controlada calculada contra el ultimo `value` recibido y nunca
  mutada optimisticamente;
- solamente la invalidacion se coalesce, no los callbacks publicos;
- ningun render extra por la proyeccion de `setOptions`;
- ningun render extra en `atom update -> callback -> parent rerender -> flush`;
- callbacks/errors cruzan el boundary Ajo normal.

Un handler ejecuta el command TanStack dentro de `withAction(event, command)`.
El callback por slice de v9 no transporta ese Event: el Adapter lo conserva
solamente durante el command sincrono. `withAction` guarda el valor anterior y
lo restaura en `finally`, como un stack, para que una accion sincrona anidada no
borre el Event exterior. Fuera del stack, todo trabajo asincrono ve
`undefined`. Una
reconciliacion de sistema usa `event: undefined`.

Para selection uncontrolled, el wrapper llama primero al updater default
capturado de v9, lee luego el atom resultante y emite keys si hay observer. Para
selection controlled, resuelve el updater contra el `value` codificado actual,
emite la propuesta y espera el echo del caller por el siguiente `setOptions`;
no escribe el atom. Al pasar de controlled a uncontrolled, el ultimo value
reconocido queda como punto de partida. No se aceptan external atoms.

`autoResetPageIndex:false` evita que cambios de `rows` borren una page aun
valida. Los commands Ajo de search, facet, sort y size resetean page de forma
explicita; cambios de rows clamplean solamente si la page deja de existir. Los
scheduled callbacks internos siguen siendo abort-safe y forman parte de los
tests.

Los metodos v9 de rows, cells, columns y headers viven en prototypes
compartidos. Nunca se desestructuran; se invocan con su receiver.

### Event provenance

Los updaters TanStack no transportan el DOM Event. El Adapter no inventa uno.

- handlers Ajo capturan el Event para callbacks publicos causados por esa
  accion;
- resets internos o reconciliaciones llaman callbacks sin Event;
- errors de callbacks se propagan;
- una accion posterior al abort es inerte.

### Una sola autoridad

No se combina TanStack row selection con `ajo-cloves/selection`. Tampoco se
mantiene un Set paralelo para sorting, facets o visibility.

La estructura correcta depende del modo:

~~~text
uncontrolled:
private TanStack state slice, unica autoridad

controlled:
public value, unica autoridad
        |
        v
TanStack proyecta state y propone updaters
        |
        v
public callback; el caller decide el siguiente value
~~~

No existe un Set Ajo paralelo en ninguno de los dos modos.

### No port innecesario

`@tanstack/table-core` es una dependencia in-process, determinista y sin I/O.
No necesita un port, repository ni mock publico. Contract tests cruzan el seam
de `DataTable` y unit tests internos pueden probar
`internal/data-table-model.ts` con el core real.

## Markup y theme

### Slots estables

La base posee el markup y publica `data-slot` estables para styling:

- `data-table`;
- `data-table-toolbar`;
- `data-table-search`;
- `data-table-facet`;
- `data-table-columns`;
- `data-table-reset`;
- `data-table-container`;
- `table`;
- `table-header`;
- `table-body`;
- `table-row`;
- `table-head`;
- `table-cell`;
- `data-table-sort-trigger`;
- `data-table-empty`;
- `data-table-selection-summary`;
- `data-table-pagination`;
- `data-table-page-size`;
- `data-table-page-indicator`;
- `data-table-pagination-action` con `data-action` first/previous/next/last.

Los slots son un contrato de tema, no una invitacion a cambiar estructura.

### Componentes base

`packages/ajo-ui/src/data-table.tsx` compone los families base existentes:

- Checkbox para row selection;
- Menu para facets y column visibility;
- Select para page size;
- Toolbar para agrupar controls;
- `announce` para result changes.

Search usa `input type="search"` nativo y sort/pagination usan `button`
nativo: `packages/ajo-ui` no posee families base Input/Button. Todos reciben
slots y el Adapter Playa los estiliza sin invertir dependencias.

La base emite tags nativos de table porque no puede depender de `src/ui`.
El Adapter Playa comparte recipe visual con `src/ui/table.tsx`, no invierte la
direccion de dependencias.

### Reduccion del theme seam

Objetivo:

~~~tsx
export const DataTable = <T, Key extends DataTableKey>(
	args: DataTableArgs<T, Key>,
) => (
	<BaseDataTable
		{...args}
		class={cx(dataTableRecipe, args.class)}
	/>
)
~~~

La factibilidad de selectors `data-slot` con Uno se valida en el spike. V1
requiere que el Adapter Playa pueda resolverse con slots. Si no alcanza, Phase
0 se detiene y se disena una Interface de theme-authoring explicitamente
exportada; un prop importable desde `src/ui` no puede llamarse privado.

No se agrega un factory de structural renderers. Si el spike exige una
Interface de theme-authoring por portals, se limita a class/slot tokens
probados por Playa y se publica en un subpath avanzado, fuera de
`DataTableArgs`.

## Accesibilidad y UX

### Nombre de table

`label` es un string requerido y se aplica como `aria-label` a la table. El
mismo string se entrega a `labels.toolbar` y `labels.pagination` para que cada
landmark tenga un nombre contextual y localizable, incluso con dos DataTables
en la misma page.

Esto corrige el problema actual donde el nombre queda en el outer `div` y no
depende de una clase Playa `sr-only`. Visible caption y `aria-labelledby`
quedan fuera de V1: agregarlos sin una segunda fuente divergente requiere un
consumer concreto.

Las formas Ajo `aria-*`, `attr:aria-*` y property setters equivalentes quedan
bloqueadas por `FixedArgs` y se descartan al forwardear attrs en runtime. El
caller no puede nombrar el outer root por un camino alternativo.

### Sorting

- button real dentro de `th`;
- `scope="col"`;
- `aria-sort` solamente en la column activa;
- label anuncia la siguiente accion;
- icono no es el unico indicador visual;
- estado no depende solamente de color.

### Selection

- cada checkbox incluye una label derivada de row;
- `selection.getRowLabel` es obligatorio y produce copy humana estable;
- `labels.selectRow/deselectRow` localizan la accion a partir de ese nombre;
- el header checkbox explica si afecta la page o todos los resultados
  filtrados; nunca llama "visible" al overscan virtual;
- mixed state representa una page parcialmente seleccionada;
- selection summary no roba foco.

### Toolbar y pagination

- `role="toolbar"` tiene nombre;
- search tiene label aunque use placeholder;
- facet, columns y page-size controls tienen nombres;
- pagination usa `nav` con label contextual;
- disabled no reemplaza elementos por texto durante interaction.

### Announcements

Después de una accion de search, facet o reset se anuncia el numero de
resultados filtrados antes de pagination. `labels.results(count)` recibe ese
numero. Sorting comunica state mediante `aria-sort` y el nombre del trigger;
no agrega un live announcement en V1.

Search state no espera al live region. Announcements de typing se coalescen
despues de 200 ms sin input; Enter, reset y facet actions anuncian
inmediatamente. Durante IME no se anuncia hasta `compositionend`.

No se anuncia cada render. La policy se verifica con screen reader y no
solamente inspeccionando ARIA.

### Keyboard

V1 usa el comportamiento nativo:

- Tab entra a controls interactivos;
- Space activa checkbox/button enfocado;
- Menu y Select siguen sus families base;
- no se interceptan arrows a nivel table;
- focus permanece por stable key cuando una row sigue renderizada.

Si el elemento enfocado desaparece:

1. se restaura el mismo control solamente cuando row key y column ID
   sobreviven y siguen materializados en la page/filter actual;
2. si la transicion fue causada por un control externo que sigue montado, ese
   trigger conserva foco;
3. si el target fue eliminado o dejo de estar materializado, foco vuelve a la
   `table` nombrada, que admite `tabindex="-1"` programatico, y se anuncia la
   actualizacion;
4. foco nunca queda silenciosamente en `body`.

## Server mode futuro

No entra en V1. Lo que queda definido es el limite del Module, no una API
anticipada.

### Principio

DataTable nunca hace fetch. Route/loader posee:

- URL query;
- request;
- pending/error;
- rows recibidas;
- `back/more` o total;
- retry y cache.

DataTable solamente renderizaria el snapshot y emitiria una intencion de query.

### Consistencia obligatoria

Cada transformacion debe operar sobre el universo completo que afirma
representar. Si `rows` es solamente una page/window remota, filtering, sorting
y pagination forman una query remota atomica: ordenarla localmente presentaria
resultados falsos. Si el server entrega el conjunto completo ya filtrado, una
pagination cliente posterior puede ser correcta.

### Constraints observadas

El futuro slice debe:

- elegir una route productiva como consumer;
- distinguir coverage completa de page/window parcial sin exponer flags
  `manual*`;
- representar la page one-based observada hoy, o navigation/cursors opacos si
  el consumer real los usa, sin filtrar el page index de TanStack;
- representar `back/more` y total opcional sin inventar `rowCount`;
- usar `back/more`, no `getCanNextPage`, cuando page count es desconocido;
- mantener selection key-first porque row models solo materializan rows
  cargadas;
- separar la query confirmada que produjo `rows` de una pending intent. Los
  indicators no adoptan B mientras las rows todavia corresponden a A, salvo
  que el contrato elija y pruebe una estrategia optimistic explicita;
- probar intents A -> B -> C resueltas out-of-order, abort y browser
  back/forward;
- resolver query URL, pending, stale data, error, retry y announcements con
  ese consumer;
- medir al menos O(rows cargadas + selected keys), no prometer siempre
  O(page size);
- disenar una extension discriminada y Ajo-native recien entonces.

## Integracion VirtualList-first

TanStack Table no virtualiza. Produce un ordered row model. La virtualizacion
decide que indexes materializar.

`ai/vlist.md` se implementa primero y cierra un engine privado
renderer-neutral. La relacion decidida es:

~~~text
packages/ajo-ui/src/virtual.ts
    geometry, measurement, range, focus y scroll privados
                   /                    \
                  /                      \
     VirtualList<T, Key>          VirtualDataTable<T, Key>
           ul/li              table/thead/tbody/tr table-aware
~~~

No se debe hacer:

~~~tsx
<VirtualList>
	<tr>...</tr>
</VirtualList>
~~~

El `VirtualList` publico posee semantica `ul/li` y su propio scroll container.
No puede contener `tr` validamente.

Reutilizar `packages/ajo-ui/src/virtual.ts` ya no es una pregunta. Lo que el
spike debe resolver es la geometria tabular encima de ese engine. La primera
opcion es una table nativa con spacer rows superior/inferior en `tbody`; la
alternativa posicionada/grid permanece privada y solamente gana si native
table falla gates de width, sticky, dynamic height o accessibility tree.

### Sibling publico, no flag

La forma bundle-safe es un sibling de la misma familia:

~~~ts
export type VirtualDataTableArgs<
	T,
	Key extends string | number = string | number,
> = Omit<DataTableArgs<T, Key>, 'labels' | 'pagination'> & {
	pagination?: never
	labels?: Partial<DataTableCommonLabels & DataTableVirtualLabels>
	estimateSize: number | ((row: T, sourceIndex: number) => number)
	overscan?: number
	prerender?: number
}
~~~

~~~tsx
<VirtualDataTable
	class="h-96"
	label="Payments"
	rows={payments}
	getRowKey={getPaymentKey}
	columns={columns}
	estimateSize={44}
/>
~~~

`class="h-96"` no es styling ornamental: como en `VirtualList`, el layout debe
dar al root un block size util. La base aplica al root el layout funcional
`display:flex; flex-direction:column; min-block-size:0`; el
`data-table-container` interno es el unico scrollport y usa
`flex:1; min-block-size:0; overflow:auto`. Esto permite tambien ocupar un track
grid/flex acotado con `min-height:0`, sin agregar una prop de pixels ni un
`max-height` magico. Sin block size util no hay un viewport que virtualizar.

No se agrega `virtual`, `mode` ni un discriminant dormido a `DataTable`.
`DataTable` registra pagination y no importa `virtual.ts`;
`VirtualDataTable` omite la feature/model de pagination e importa el engine
virtual. Ambos comparten column contract, filtering, sorting, visibility,
selection, markup helpers, labels y recipe. El root barrel debe tree-shakear el
sibling no usado; un subpath explicito queda disponible como aislamiento duro.

El sibling se exporta solamente despues del geometry/AT gate. No se reserva una
prop si el spike falla. Como Ajo es greenfield, el primer corte de la familia
puede esperar ese resultado y entrar sin una migration posterior.

### Contrato tabular virtual

El renderer especifico debe resolver:

- table layout frente a CSS grid/flex;
- sticky header obligatorio;
- row height fija o dinamica;
- focus pinning al desmontar rows;
- `aria-rowcount` y row indexes;
- scroll container ownership;
- horizontal overflow;
- fragment navigation;
- limites de find-in-page, lectura secuencial e impresion.

Los virtual indexes siempre indexan `table.getRowModel().rows`, nunca `rows`
crudas. `row.id` es la key geometrica. Filter y sort vuelven el scroll al
inicio; selection y visibility conservan el anchor cuando la row sigue. El
header select-all opera sobre resultados filtrados logicos, nunca sobre el
overscan/viewport materializado.

Pagination y virtualization son estrategias UX mutuamente excluyentes. No se
encadenan dos ventanas. `DataTable pagination={false}` sigue siendo valido para
datasets pequenos que necesitan DOM completo; el scroll continuo grande usa
`VirtualDataTable`.

Row virtualization es el unico axis inicial. Column virtualization requiere
otro consumer, otro geometry gate y otra Interface; no entra escondida en este
slice.

La primera Implementation soportada debe poseer un solo element scrollport y
compartir recipe con ScrollArea. No se anida en ScrollArea para obtener dos
viewports o lifecycles. Window/external scrolling permanece un seam privado
posible, no una promesa de V1.

Ese scrollport usa `tabindex="0"` por default, focus ring visible y el nombre
producido por `labels.viewport(label)`, de modo que incluso una table sin
controls interactivos sea alcanzable y desplazable por teclado. La `table`
conserva `tabindex="-1"` solamente como fallback programatico; al eliminarse la
row enfocada recibe `focus({ preventScroll:true })`.

`virtual.ts` posee pinning y deteccion de la key desmontada, pero no hardcodea
el destino de fallback. Su seam privado recibe la policy del renderer:
`VirtualList` entrega su viewport; `VirtualDataTable` entrega la table nombrada.

Si gana la geometry con spacer rows, cada spacer debe ser markup table valido
(`tr > td` con el `colspan` efectivo), `aria-hidden="true"`, sin contenido ni
targets de foco. Los tests de accessibility tree deben demostrar que no agrega
filas, no altera `aria-rowcount`/`aria-rowindex` y no se anuncia. Si un browser
o AT lo expone como row fantasma, esa geometry falla y gana la alternativa
privada; no se compensa falsificando los indices logicos.

La table virtual expone `aria-rowcount` logico y `aria-rowindex` en cada row
materializada, con el offset de header verificado en AT. Esto no hace aparecer
las rows ausentes para screen reader browse mode, find o print; el default
paginado permanece la opcion mas predecible cuando esas capacidades dominan.

## Error contract

Errores estructurales de configuracion lanzan `TypeError` determinista antes
de renderizar rows:

- `label` no-string o vacio;
- row key string vacia;
- row key number no finita;
- row key duplicada;
- `columns` vacio o todas las columns `defaultHidden`;
- column ID vacio o duplicado;
- column/facet/option label no-string o vacio;
- override de `labels` no-string o vacio;
- display column sin `cell`;
- facet sobre display column;
- facet option value vacio o duplicado;
- sizes vacias o duplicadas;
- `defaultSize` explicito ausente de sizes;
- duplicate keys en selection `value/defaultValue`.

Errores de dominio numerico lanzan `RangeError` determinista:

- `defaultSize` o una size no entero positivo;
- `VirtualDataTable.estimateSize` no finito o no positivo;
- resultado no finito o no positivo de `estimateSize(row, sourceIndex)` al
  materializar esa row;
- `overscan` o `prerender` no entero o negativo.

Un number no finito o un valor Date/object/array/bigint/tipo mixto sin
mapper/comparator compatible lanza `TypeError` de forma lazy cuando search,
facet o sort lo evalua. No existe un scan de inferencia adicional antes del row
model.

`selection.getRowLabel` que produce un valor no-string o vacio falla al
materializar el checkbox de esa row. Un value de cell no renderizable sin
`cell` custom falla al materializar esa cell.

Cada callback de `labels` se valida cuando se consume: un resultado no-string
o vacio lanza `TypeError` y una excepcion original se propaga. Ningun override
puede eliminar el accessible name de search, sort, row selection, page
actions, toolbar o pagination.

Errores de `getRowKey`, accessor, mapper, comparator, cell renderer o callback:

- se propagan al error boundary;
- no se convierten en empty state;
- no se loguean y silencian;
- incluyen contexto de column/row cuando Ajo puede agregarlo sin perder el
  error original.

Después del abort:

- el Adapter no conserva subscriptions ni referencias externas;
- microtasks pendientes no llaman `host.next`;
- callbacks publicos no vuelven a ejecutarse;
- la table queda colectable.

## Performance contract

### Complejidad esperada

Con referencias estables:

- core row model: O(rows);
- search/facets: O(rows x columns activas);
- sorting: O(rows log rows);
- render paginado: O(page size x columns visibles);
- render virtual: O(window materializada x columns visibles), donde la ventana
  incluye viewport, overscan, prerender y rows temporalmente fijadas por focus;
- DOM virtual acotado por esa ventana, no por el total de resultados;
- cambiar selection no debe invalidar filter/sort/page row models;
- cambiar page no debe recalcular accessors de todo el dataset.

### Reglas para callers

- rows y columns son snapshots inmutables;
- conservar referencias de rows, columns y `getRowKey` cuando no cambia
  contenido/semantica;
- accessors devuelven data cruda y barata;
- formatting costoso vive en `cell`;
- comparators no crean `Intl.Collator` por comparacion;
- renderers no mutan state;
- no crear columns inline en cada yield sin necesidad.

### Bundle gates

Se construyen cinco fixtures:

1. app que no importa la familia;
2. app que importa el root barrel pero no usa la familia;
3. app que usa solamente `DataTable` paginada;
4. app que usa solamente `VirtualDataTable`;
5. app que usa ambas strategies.

Aceptacion:

- fixtures 1 y 2: cero bytes TanStack;
- fixture 3: cero bytes de `@tanstack/virtual-core` y maximo inicial de
  15 KiB (`15,360 B`) gzip para Table v9 + Store + bridge;
- fixture 4: cero pagination feature/model; budget combinado inicial de
  Table + Virtual + bridges <= 22 KiB gzip, a congelar con el entry real;
- fixture 5: deduplica ambos cores y helpers, sin dos copias del renderer;
- Adapter + policy Ajo: medir delta neto despues de borrar el engine viejo;
- no agregar adapters React/Lit ni fuzzy-search dependencies;
- si el root barrel rompe tree-shaking, corregir exports o publicar un subpath
  antes de merge;
- `sideEffects: false` en `ajo-ui` solamente se declara despues de auditar el
  package completo.

Cada fixture guarda source, command exacto, target/browsers, lockfile e
integrities, reglas de externalization, esbuild metafile y hashes de outputs.
Los numeros diagnosticos de este documento no son golden files.

### Runtime fixtures

Fixture representativo:

- 10,000 rows;
- 8 columns;
- strings, numbers, booleans y una facet multi-value;
- 25 rows por page;
- selection y visibility activas.

Fixture informativo:

- 100,000 rows;
- misma distribucion;
- no convierte el numero de marketing de una libreria en una promesa Ajo.

Fixtures virtuales:

- 10,000 rows con alturas dinamicas y contenido interactivo;
- 100,000 rows de altura fija;
- mismas ocho columns y transforms para separar costo de row model, geometry y
  DOM;
- resize de viewport/rows, scroll rapido, focus pinning y reemplazo de rows.

Se miden dos capas:

1. engine microbench sin DOM, forzando la primera lectura de core, filtered,
   sorted y paginated row models;
2. end-to-end con dos marks separados:
   - main-thread/action hasta la siguiente presentation;
   - visual settle hasta el segundo `requestAnimationFrame`.

`Cold` significa construct + primera materializacion de row models + primer
DOM commit/paint. Crear una table sin leer models no cuenta como cold work.

Medir:

- cold materialization;
- repeat render con referencias iguales;
- search input a painted result;
- facet toggle;
- first sort y reverse sort;
- page next/previous;
- select one/select page/select filtered results;
- replace de rows;
- memoria despues de 50 ciclos, con varias muestras post-GC;
- retained DOM/listeners y tendencia de heap, no una unica foto.

### Budgets iniciales

En el hardware/browser fijado por Phase 0, los thresholds quedan numericos en
el artifact de benchmark. Cada operacion toma al menos 50 samples despues de
warm-up dentro de al menos cinco runs independientes; se guardan p50, p95 y
max por run y el criterio agregado elegido en Phase 0.

Los candidatos iniciales son:

- processing de page y selection p95 dentro de un frame de 60 Hz;
- visual-settle de page y selection tiene un budget separado de hasta dos
  frames; no se compara contra el budget de processing;
- repeat render sin cambios no reconstruye column defs;
- selection no vuelve a ejecutar accessors;
- DOM data rows no supera page size;
- DOM virtual no supera el range calculado mas las rows fijadas por focus;
- scroll virtual no produce blank coverage, drift de anchor ni crecimiento
  monotono de observers/listeners/elements cacheados;
- ninguna long task en page/selection con el fixture de 10k;
- filter/sort engine microbench no empeora mas de 20% frente al fixture
  TanStack vanilla con identicos data, columns, state y lecturas;
- end-to-end usa budgets absolutos salvo que ambos fixtures compartan el mismo
  renderer y DOM;
- memoria alcanza un plateau sin crecimiento monotono despues de abort y GC
  controlado por el harness.

Phase 0 fija warm-ups, N, p95, marks y mecanismo de GC. Los thresholds
absolutos de filter/sort no se inventan antes de medir el hardware de CI.

## Plan detallado

Las phases siguientes son checkpoints de una unica rama/slice de
implementacion. Durante Phases 1 a 4 los nuevos archivos pueden coexistir en el
source tree para poder probarse, pero no se exportan ni son alcanzables por
consumers; no constituyen un segundo runtime ni un compatibility path. El export
map, los consumers y la eliminacion del engine viejo aterrizan juntos en Phase
5. No se mergea ni publica un estado intermedio.

### Phase -1: prerequisite VirtualList

1. Completar las Phases 0 a 8 de `ai/vlist.md`.
2. Confirmar que `virtual.ts` es renderer-neutral: count, keys, range,
   measurement, focus pinning y scroll targeting; ningun `ul/li`.
3. Confirmar un solo scroll owner, recipe compartida con `ScrollArea`, cleanup
   abort-safe, SSR y browser/performance gates.
4. Registrar `@tanstack/virtual-core` exacto y sus bundle artifacts.

Exit gate: VirtualList funciona como familia publica y su foundation privado
puede recibir otro renderer sin forkear geometry o lifecycle. Hasta entonces no
comienza codigo de DataTable nuevo.

### Phase 0: v9 exacto, contracts y spikes

1. Resolver de nuevo `@tanstack/table-core@beta`, auditar source/changelog y
   fijar el numero exacto; `9.0.0-beta.47` es el snapshot, no un range.
2. Fijar tambien la version transitiva de `@tanstack/store` mediante lockfile y
   `pnpm.overrides` mientras upstream declare `^`; registrar ambas integrities.
3. Verificar el engine efectivo de Node del repo (`^20.19 || >=22.12` por Vite)
   y CI, ademas del `>=20` de Table.
4. Compilar un spike real con `constructTable`, feature profiles explicitos,
   `createOptionsStore:false`, Store subscription, `setOptions` y abort.
5. Probar que no existen imports `stockFeatures`, registries completos, Lit,
   React, worker plugin ni `createCoreRowModel` manual.
6. Inventariar subpaths publicos reales de `ajo-ui` y disenar el export map
   explicito que reemplaza `./*`, incluyendo negative resolution fixtures.
7. Tratar el componente actual y su story como evidencia. Escribir target
   contracts para search, facet, sort, visibility, selection, page, empty,
   duplicate keys, reorder, schema changes, controlled selection y focus.
8. Ejecutar el theme spike con Checkbox, Menu, Select, Toolbar, input/button
   nativos, slots, portals, Uno production build y disabled/focus states.
9. Prototipar dos geometries virtuales sobre `virtual.ts`: table nativa con
   spacer rows y alternativa posicionada/grid interna.
10. Capturar SSR, accessibility tree, sticky header, horizontal overflow y
    dynamic heights de ambas; no congelar `VirtualDataTable` antes del gate.
11. Crear benchmarks deterministas y los cinco bundle fixtures, con seed,
    versions, hardware, warm-up, cinco runs, metafiles y output machine-readable.

Exit gate: beta/store pins, Interface base, feature profiles, theme seam,
geometry candidata y budgets documentados. Un fallo corrige v9 o el diseno; no
habilita un adapter v8 paralelo.

### Phase 1: model v9 privado y contracts de state

1. Crear `internal/data-table-contract.ts` y `internal/data-table-model.ts`.
2. Implementar `ajoTableReactivity(host)` sobre Store con options plain,
   cleanup real, scheduler abort-safe y una subscription coalescida.
3. Definir profiles estaticos paginated y virtual; el segundo omite toda
   pagination feature/model.
4. Implementar key encoding, validations y caches por row/column identity.
5. Traducir columns con filter/sort functions privadas minimas y
   `sortUndefined:false`.
6. Implementar search global, facets OR/AND, single sort, visibility y las dos
   strategies de select-all.
7. Implementar selection uncontrolled y controlled por callback de slice, sin
   Set, clove o external atom paralelo.
8. Implementar page reset explicito para search/facet/sort/size y clamp para
   rows reemplazadas con `autoResetPageIndex:false`.
9. Implementar capability/schema transitions y event provenance.
10. Probar una table/subscription por Host, no extra render durante
     `setOptions`, updater errors, callbacks que lanzan, abort antes del flush,
     parent rerender antes del flush, commands/eventos anidados, repeated
     mount/unmount, SSR sin DOM y collectability.
11. Comparar row models/materializacion contra un fixture v9 vanilla exacto.

Exit gate: invariants, lifecycle, row-model parity y surface type tests verdes;
ningun tipo TanStack aparece en declaraciones publicas.

### Phase 2: renderer comun y DataTable paginada

1. Crear `internal/data-table-renderer.tsx` con native markup y slots owned por
   la base.
2. Implementar `DataTable` paginada sobre el profile correspondiente.
3. Conectar components base, labels, table naming, `scope`, `aria-sort`, mixed
   select-page, pagination names, announcements y empty `colspan`.
4. Mantener `pagination={false}` como DOM completo explicito para datasets
   pequenos.
5. Implementar focus preservation/fallback por row key + column ID.
6. Probar SSR/hydration, keyboard y la matriz AT paginada.
7. Crear el Adapter Playa Stateless por recipe/slots, sin renderer callbacks.
8. Ejecutar stories, root forwarding, type inference y production CSS.

Exit gate: strategy paginada completa pero aun no se reemplaza el export
existente. La Implementation final se valida antes del corte.

### Phase 3: VirtualDataTable sibling

1. Crear `virtual-data-table.tsx` sobre el profile sin pagination y el mismo
   contract/renderer.
2. Alimentar `virtual.ts` con `table.getRowModel().rows` y `row.id`.
3. Elegir la geometry ganadora de Phase 0 y borrar la alternativa.
4. Hacer del viewport el unico scroll owner; compartir recipe, no anidar
   `VirtualList` ni `ScrollArea`.
5. Implementar sticky header, width sync, dynamic measurement, spacer/offset,
   horizontal overflow y SSR/prerender determinista.
6. Implementar focus pinning, `aria-rowcount`, `aria-rowindex` y fallback al
   table nombrado cuando desaparece la key.
7. Filter/sort vuelven al inicio; selection/visibility preservan anchor.
8. Select-all opera sobre filtered results logicos, nunca mounted range.
9. Probar 10k dynamic y 100k fixed rows, blank coverage, anchor drift, resize,
   memory plateau, Chrome/Firefox/WebKit y Safari iOS real.
10. Documentar limites honestos de AT browse, find, print y fragments.

Exit gate: geometry, AT, SSR, browser y performance verdes. Si falla, no se
exporta el sibling ni se agrega una prop placeholder a `DataTable`.

### Phase 4: hardening integrado y packaging

1. Ejecutar los cinco bundle fixtures con root/subpath production entries.
2. Verificar cero Virtual en DataTable y cero pagination en VirtualDataTable.
3. Medir delta bruto y calcular el neto contra el graph viejo aislado; Phase 5
   confirma el neto real despues del borrado.
4. Ejecutar runtime 10k/100k, memoization por slice, DOM bound y memory/abort.
5. Ejecutar type, unit, SSR, hydration, stories, keyboard, AT, browser y Uno
   production gates de ambas strategies.
6. Corregir unstable rows/columns/accessors de fixtures; no maquillar el
   benchmark.
7. Construir y probar el export map explicito, incluyendo que imports de
   contract/model/renderer internos fallen en typecheck y runtime resolution.
8. Registrar commands, versions, integrities, traces, hashes y resultados en
   este documento.

Exit gate: todos los budgets y contracts pasan. Cambiar un budget requiere una
decision documentada; nunca una excepcion silenciosa.

### Phase 5: corte atomico greenfield

1. Reemplazar `DataTable` y, si paso Phase 3, agregar `VirtualDataTable`.
2. Reescribir la story y contracts locales contra la Interface final; no
   conservar nombres anteriores por conveniencia.
3. Eliminar los 14 renderer hooks, class hooks redundantes y todo el engine
   manual: value readers, compare, filter/sort/slice, Sets, Maps y row
   `selection()`.
4. Borrar prototypes, fixtures y paths descartados; no dejar feature flags,
   aliases, deprecated exports ni dual pipeline.
5. Reemplazar el wildcard `./*` por el export map explicito ya validado.
6. Confirmar que `Table` semantico manual permanece independiente.
7. Ejecutar la matriz completa despues del borrado y confirmar el delta neto.

Exit gate: una sola autoridad v9, una familia cohesiva y ningun estado
intermedio publicado.

### Phase 6: documentacion y cierre experimental

1. Actualizar `ai/ui.md`, READMEs, catalogo y story docs.
2. Documentar `Table` vs `DataTable` vs `VirtualDataTable` vs `VirtualList`.
3. Documentar snapshots, keys, accessors, state ownership, viewport sizing,
   pagination vs virtualization y a11y limits.
4. Registrar pins exactos y upgrade procedure.
5. Agregar examples cliente y ejecutar full test/build matrix.

### Phase 7: server slice futuro

Trigger: una route real se migra end-to-end.

1. Elegir la route y describir su query URL.
2. Modelar `back/more` y total opcional.
3. Disenar una extension Ajo-native con ese consumer, no flags `manual*`.
4. Para remote page/window, emitir una query atomica para las transforms que
   requieren coverage completa. Para coverage completa, delegar al server
   solamente las transforms que el consumer realmente posee.
5. Mantener fetch en route/loader.
6. Resolver pending, stale rows, error y retry.
7. Probar back/forward browser.
8. Probar selection key-first across pages.
9. Medir costo contra rows cargadas y selected keys.

No se agrega el type remoto antes de este slice. Column virtualization tambien
permanece fuera hasta tener su propio consumer y geometry gate.

## Matriz de validacion

Comandos de repo esperados:

~~~powershell
pnpm exec tsc --noEmit
pnpm --filter ajo-ui test
pnpm test:unit
pnpm stories:test --match data-table --port <free-port>
pnpm stories:test --match virtual-data-table --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
~~~

La implementacion debe registrar:

| Area | Evidencia |
|---|---|
| types | public contract y misuse fixtures |
| unit | adapter, invariants y state transitions |
| SSR | markup, root attrs y no DOM access |
| stories | behavior y themed integration |
| browser | keyboard, focus, announcements |
| production | CSS, tree-shaking y runtime |
| bundle | cinco fixtures, profiles y transitive pins comparables |
| performance | paginated 10k; virtual 10k dynamic + 100k fixed |
| lifecycle | una subscription, abort, scheduled work y collectability |
| virtual geometry | sticky, widths, blank coverage, anchor y resize |

## Upgrade policy

TanStack permanece privado, pero durante la etapa experimental se sigue
deliberadamente la ultima beta v9 verificada. Cada upgrade es un corte atomico
del engine, nunca una migration publica.

1. Resolver el dist-tag `beta` y registrar el candidato.
2. Leer release notes, migration guide y diff de core, reactivity y features
   usadas.
3. Fijar exactamente Table y Store; actualizar lock, overrides e integrities.
4. Compilar el adapter contra la API real, sin compatibility conditionals.
5. Correr contract/type/state/lifecycle/error tests.
6. Correr SSR/hydration, keyboard, AT y browser gates.
7. Correr los cinco bundles y runtime/virtualization benchmarks.
8. Revisar Node engines, dependencies, `sideEffects`, advisories y license.
9. Borrar cualquier workaround de la beta anterior que ya no corresponda.
10. Actualizar este snapshot y el hash del fixture.

Un gate fallido mantiene temporalmente el ultimo pin v9 conocido, mientras se
investiga; no autoriza volver a v8 ni publicar dos adapters. Cuando v9 sea
stable, se aplica exactamente el mismo proceso y se cambia al release estable
si pasa. La Interface Ajo tambien puede mejorar con breaking changes mientras
el proyecto siga greenfield, pero nunca por filtracion accidental de upstream.

Feature registration y churn v9 quedan encapsulados en
`internal/data-table-model.ts`; ningun tipo TanStack aparece en la Interface
publica.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| breaking change entre betas v9 | pin exacto, adapter privado, source audit y upgrade atomico |
| range transitivo de Store cambia el runtime | lock + `pnpm.overrides` exacto e integrity registrada |
| binding vanilla tiene hooks incompletos | wrapper Ajo con options plain y cleanup contract-tested |
| Table v9 agrega bundle significativo | profiles explicitos, subpaths, cinco fixtures y delta neto |
| TanStack types filtran al caller | type tests y ningun re-export |
| wildcard de package publica internals TSX | export map explicito + negative resolution tests |
| invalidacion pendiente duplica un rerender del owner | state/render versioning y flush no-op |
| theme seam vuelve a crecer | slots + recipe, no structural renderers |
| selection tiene dos owners | retirar row `selection()` |
| inline columns invalidan memoization | snapshot contract y dev diagnostics |
| index IDs reaparecen | `getRowKey` obligatorio |
| remote page se transforma como dataset completo | coverage explicita y query atomica |
| virtual rows rompen semantics | sibling table-specific, no VirtualList composition, AT gate |
| DataTable paginada arrastra Virtual | entry/profile separado y zero-byte bundle gate |
| native table se convierte en grid accidental | a11y contract y no `role="grid"` |
| benchmark de libreria se toma como promesa | fixtures Ajo 10k/100k |

## Decisiones cerradas

- Ajo es greenfield: no hay retrocompatibilidad, shims ni dual pipeline.
- `VirtualList` y su foundation se implementan antes de DataTable.
- Dynamic DataTable pertenece a `ajo-ui`; no hay table clove.
- `Table` semantico manual permanece independiente.
- Se usa la ultima beta v9 verificada con Table/Store pins exactos;
  `9.0.0-beta.47` es el snapshot actual y v8 no es fallback.
- TanStack core, atoms, features y options quedan privados.
- `ajo-ui` usa exports explicitos; model/contract/renderer no son subpaths.
- No se instala adapter de framework ni se implementa un atom engine propio.
- Feature profiles son explicitos; no `stockFeatures`, registries completos ni
  core row model manual.
- Ajo usa `createOptionsStore:false`, Store state y cleanup por Host.
- Stable row key es obligatoria.
- Facet vive con su column.
- Selection es key-first.
- `DataTable` es client-side y paginada por default.
- `VirtualDataTable` es un sibling/subpath sin pagination, no un flag; se
  exporta solamente si supera geometry/AT/perf gates.
- Ambos mantienen native table semantics y comparten renderer/policy.
- `virtual.ts` se reutiliza por engine, nunca componiendo `VirtualList<ul/li>`.
- Pagination y virtualization son strategies UX mutuamente excluyentes.
- Theme adapter no reconstruye 14 parts.
- Server mode es un slice posterior dirigido por un consumer real.

## Decisiones que requieren evidencia del spike

- numero exacto de la beta/store el dia de implementacion, no la familia v9;
- defaults finales de page size;
- si search necesita coalescing interno;
- forma exacta de la recipe Uno por slots;
- geometry nativa-spacers frente a alternativa posicionada privada;
- si `VirtualDataTable` supera el gate para entrar en el primer corte;
- defaults virtuales de `overscan`/`prerender` reutilizados o ajustados;
- bundle neto despues de eliminar la Implementation vieja;
- thresholds absolutos de filter/sort;
- si la guia de consumers debe preferir el subpath directo sobre el root
  tree-shakeable;
- copy exacta de announcements.

Estas decisiones no reabren ownership, v9, el orden VirtualList-first ni el
principio de un engine privado compartido.

## Fuentes primarias

### TanStack Table v9

- [Release `9.0.0-beta.47`](https://github.com/TanStack/table/releases/tag/v9.0.0-beta.47)
- [V9 beta overview](https://tanstack.com/blog/tanstack-table-v9-taking-form)
- [V9 installation status](https://tanstack.com/table/beta/docs/installation)
- [Feature registration](https://tanstack.com/table/beta/docs/reference/index/functions/tableFeatures)
- [Feature registry types](https://tanstack.com/table/beta/docs/reference/index/interfaces/TableFeatures)
- [`constructTable`](https://tanstack.com/table/beta/docs/reference/index/functions/constructTable)
- [Table instance y atom state](https://tanstack.com/table/beta/docs/guide/tables)
- [Vanilla table state](https://tanstack.com/table/beta/docs/framework/vanilla/guide/table-state)
- [V9 Lit migration y lifecycle](https://tanstack.com/table/beta/docs/framework/lit/guide/migrating)
- [V9 Lit quick start](https://tanstack.com/table/beta/docs/framework/lit/quick-start)
- [V9 virtualization guide](https://tanstack.com/table/beta/docs/framework/lit/guide/virtualization)
- [Store reactivity binding source fijado](https://github.com/TanStack/table/blob/v9.0.0-beta.47/packages/table-core/src/store-reactivity-bindings.ts)
- [Lit `TableController` source fijado](https://github.com/TanStack/table/blob/v9.0.0-beta.47/packages/lit-table/src/TableController.ts)
- [V9 beta package metadata](https://registry.npmjs.org/@tanstack/table-core/9.0.0-beta.47)

### TanStack Table v8, baseline historico

- [Release v8.21.3](https://github.com/TanStack/table/releases/tag/v8.21.3)
- [Row models v8](https://tanstack.com/table/v8/docs/guide/row-models)
- [table-core v8 metadata](https://registry.npmjs.org/@tanstack/table-core/8.21.3)

### Otras librerias

- [AG Grid modules](https://www.ag-grid.com/javascript-data-grid/modules/)
- [AG Grid Community frente a Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/)
- [Handsontable license keys](https://handsontable.com/docs/javascript-data-grid/license-key/)
- [Tabulator documentation](https://www.tabulator.info/docs/6.x/)
- [Tabulator Virtual DOM](https://tabulator.info/docs/6.3/virtual-dom)
- [Grid.js documentation](https://gridjs.io/docs/)

### Accesibilidad

- [WAI-ARIA APG Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [WAI-ARIA APG Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WAI sortable table example](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
- [WAI table caption guidance](https://www.w3.org/WAI/tutorials/tables/caption-summary/)

## Conclusion

La integracion cohesiva no es "usar TanStack en cada caller". Es hacer que
TanStack desaparezca:

- `ajo-cloves` aporta lifecycle y capacidades generales;
- `ajo-ui` absorbe Table v9 beta detras de un model privado;
- `VirtualList` fija primero geometry y scroll ownership;
- `DataTable` paginada y `VirtualDataTable` comparten familia, no bundle
  accidental ni markup incorrecto;
- Playa aplica el tema mediante slots;
- `Table` sigue resolviendo markup manual;
- routes siguen siendo owner del fetching;
- el renderer virtual reutiliza engine, no semantica `ul/li`.

El resultado buscado tiene una Interface menor que la actual, una
Implementation feature-scoped, state atomico, un solo lifecycle y un costo de
bundle visible y controlado. No hay retrocompatibilidad que proteger: se borra
el engine anterior y se conserva solamente la forma final que pase los gates.
Si un spike falla, se corrige el adapter, la geometry o la Interface antes del
corte; no se filtra TanStack, no se sostiene v8 en paralelo y no se agregan
props como deuda anticipada.
