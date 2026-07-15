# Playa: package `ajo-ui-playa` y contrato UnoCSS

Estado: implementada y verificada; Phase 5 permanece deferred hasta que exista
un consumer real fuera del toolchain Ajo/UnoCSS

Fecha del snapshot externo: 2026-07-14

Owner de la decision: `D:\ajo-kit`

Este archivo es la fuente canonica local para separar el theme Playa en el
package npm `ajo-ui-playa` e integrarlo con UnoCSS. Debe mantenerse alineado
con `ai/ui.md`, `ai/architecture.md`, `readme.md`, `AGENTS.md` y la
implementacion real.

La documentacion online consultada corresponde a UnoCSS `66.7.5`. El repo fija
`66.7.2`; los contratos relevantes de extraction, presets, pipeline y Vite se
contrastaron tambien con esa version instalada. Ninguna afirmacion de
compatibilidad futura reemplaza los fixtures sobre la version exacta que use
Ajo.

## Premisa greenfield

`ajo`, `ajo-kit` y la capa themed siguen en experimentacion, no son publicos y
no se usan en produccion. No existe una Interface publicada que conservar ni
una base instalada que migrar. Por lo tanto:

- no se agregan aliases, deprecations, shims ni dos caminos de estilos;
- el corte puede mover `src/ui`, cambiar imports y retirar el path anterior;
- se elige un solo contrato canonico de distribucion para Playa;
- la Interface puede romperse antes de cerrarse si un spike demuestra una
  forma materialmente mejor;
- greenfield elimina deuda de compatibilidad, no los gates de SSR, HMR,
  correctness, accesibilidad, bundle, CSS y produccion;
- la meta es una solucion micro, simple, cohesiva, robusta, reliable,
  performant, elegante y legible, no una replica literal de otro ecosistema.

## Decision ejecutiva

Playa se convierte en un deep Module con un export map y dos ramas de entrada
aisladas:

```text
runtime:  ajo-cloves -> ajo-ui -> ajo-ui-playa/<family> -> app
          behavior       unstyled  themed adapters         product
          and lifecycle  families                          composition

build:    ajo-ui-playa root { playa } -> UnoCSS host -> virtual:uno.css
          preset Interface               in the app      generated CSS
```

La Interface publica separa dos usos deliberadamente:

1. `ajo-ui-playa/<family>` publica los adapters themed como source `.tsx`.
2. El root `ajo-ui-playa` publica solamente `playa()`, un preset UnoCSS sin
   opciones iniciales.

`ajo-ui` es la base interna que esos adapters componen, equivalente al rol de
Base UI detras de una capa themed. Es una dependency regular y transitiva de
`ajo-ui-playa`, no una dependency que la app declare ni una Interface que use
directamente. El consumidor instala e importa `ajo-ui-playa`; el package
mantiene encapsulada la base unstyled.

`playa()` es el unico Interface build-time. Oculta `presetWind4`, Icons/Lucide,
tokens, theme, rules, variants, shortcuts, safelist y preflights detras de una
llamada:

```ts
// uno.config.ts de la app
import { defineConfig } from 'unocss'
import { playa } from 'ajo-ui-playa'

export default defineConfig({
	presets: [playa()],
})
```

Esta forma produce Depth: una app aprende una llamada y obtiene toda la
Implementation de build del theme. Adapters, tokens, rules, recipes,
configuracion/coleccion de iconos y preflights mantienen Locality dentro de
`ajo-ui-playa`. El export graph separa la rama runtime de la rama build-time:
los family subpaths nunca alcanzan el root ni sus internals UnoCSS, y el mismo
Seam del preset sirve a builds, tests y fixtures.

Una `peerDependency` de UnoCSS es necesaria para declarar el host y el rango
compatible, pero no integra nada por si sola. npm usa peers como contrato de
compatibilidad con una herramienta host; no ejecuta ni fusiona configuracion.
La app debe instalar UnoCSS, activar su plugin, cargar `virtual:uno.css` y
consumir `playa()` explicitamente.

La estrategia de CSS es extraction directa desde los `.tsx` de
`ajo-ui-playa` importados por la app, con safelist package-local solo para
tokens verdaderamente dinamicos. Phase 0 la valido desde un tarball instalado
por version: UnoCSS `66.7.2` vio el source publicado en dev y production, SSR
compilo, el sentinel no importado quedo fuera y Vite no prebundleo
`ajo-ui-playa`. No se requiere `optimizeDeps.exclude`, safelist completa ni
globs publicos hacia `node_modules`. Un cambio de UnoCSS, Vite o formato de
publicacion debe repetir el fixture antes de alterar este contrato.

No se publica CSS precompilado en paralelo en V1. Dos modos activos duplicarian
la Interface, los preflights y la matriz de QA. Si aparece un consumidor real
fuera del toolchain Ajo/UnoCSS, esa evidencia puede reabrir la decision y
reemplazar el modo canonico.

## Objetivos

- Extraer la capa themed de la aplicacion sin contaminar `ajo-ui`.
- Encapsular `ajo-ui` como base transitiva: ninguna app themed debe declararlo
  en su manifest ni importarlo directamente.
- Mantener `ajo-cloves` libre de theme y de dependencias UnoCSS.
- Dar a una app Ajo un setup completo con una sola llamada `playa()`.
- Generar CSS en el build del host, sin UnoCSS runtime ni CSS-in-JS.
- Conservar utilities del caller en `class`, generadas desde el source de la
  propia app.
- Mantener los adapters como source `.tsx`, igual que los packages Ajo
  actuales.
- Permitir CSS proporcional a los subpaths usados si el fixture con el tarball
  real lo demuestra.
- Mantener UnoCSS, el preset y el JSON de iconos fuera del JS cliente.
- Concentrar adapters, class literals, tokens, shortcuts, rules, variants,
  preflights, safelist y configuracion de iconos en un solo Module.
- Hacer explicita la separacion entre estilos del design system y estilos del
  producto.
- Fijar correctness con contract tests, un consumer externo, stories, visual
  QA y budgets medidos.

## No objetivos de V1

- Compatibilidad con React, Vue u otros runtimes: los componentes son Ajo.
- Soportar cualquier bundler o toolchain CSS sin un consumidor concreto.
- Crear un registry, CLI o comando `ajo add` al estilo shadcn.
- Copiar source dentro de cada aplicacion.
- Ejecutar `@unocss/runtime` en el browser.
- Publicar simultaneamente preset, CSS monolitico y CSS por componente.
- Escanear todo `node_modules` o depender de paths fisicos del package manager.
- Adoptar los modos experimentales `per-module` o `dist-chunk` de UnoCSS.
- Exponer internals de `ajo-ui` o convertir tokens de composicion entre
  siblings en superficie publica.
- Crear opciones especulativas de palette, dark mode, prefix, layers o icon
  collections en `playa()`.
- Prometer tree-shaking CSS antes de medir un tarball instalado como
  dependencia real.

## Implementacion actual

### Capas de UI

La arquitectura implementada conserva un unico Seam por responsabilidad:

| Capa | Responsabilidad actual | Decision |
|---|---|---|
| `ajo-cloves` | Behavior, lifecycle, sensores y helpers generales | Sin cambios; no depende de UnoCSS |
| `ajo-ui` | Familias unstyled, markup, accesibilidad y engines privados | Base transitiva interna de `ajo-ui-playa`; no forma parte del setup de la app |
| `ajo-ui-playa` | 62 family subpaths publicos y un `modal.tsx` privado | Unica capa themed; root reservado para `playa()` |
| app/stories runtime | Composicion de producto y demostracion | Consume family subpaths de `ajo-ui-playa` |
| app build | UnoCSS y configuracion del theme | Consume el root de `ajo-ui-playa` |

Los adapters themed importan `ajo`, `ajo-ui`, `ajo-ui/utils`, `clsx` y otros
adapters Playa. No importan `ajo-cloves` directamente; la dependencia de
behavior permanece encapsulada por `ajo-ui`. Esos imports son Implementation
interna de `ajo-ui-playa`, nunca imports sugeridos a una app.

### Publicacion de packages

`ajo-ui` y los demas packages Ajo exportan source TypeScript/TSX directamente,
sin compilarlo primero a JavaScript. `ajo-ui` mantiene un export map explicito
por familia y un root barrel. Esa convencion permite que el toolchain Ajo
procese JSX y que UnoCSS vea `.tsx` antes de transformarlo.

La publicacion de source no es un detalle accidental para `ajo-ui-playa`: el
root se ejecuta como config build-time, mientras los family subpaths `.tsx`
forman parte del contrato de extraction. Compilar esos family subpaths a `.js`
obliga a reabrir y volver a probar este documento; el formato compilado del
root no cambia por si solo la extraction de componentes.

### Configuracion UnoCSS

El `uno.config.ts` raiz importa `playa()` y conserva solamente el shortcut de
producto `site-container`. Wind4, Icons/Lucide, palette, semantic theme, rules,
variants, preflights, animations, scrollbars y recipes `playa-*` viven en el
internal build-time `packages/ajo-ui-playa/src/styles.ts`. No existe una
segunda configuracion Playa en la app.

Las recipes runtime compartidas viven en
`packages/ajo-ui-playa/src/internal/recipes.tsx` y el frame compartido de
scroll en `packages/ajo-ui-playa/src/internal/scroll-area.tsx`. Son `.tsx` de
forma intencional: el pipeline default de UnoCSS inspecciona JSX/TSX, no
TypeScript plano, y estos archivos contienen class literals que forman parte
del protocolo visual privado.

### Integracion Vite

La app raiz ya usa el contrato correcto:

```ts
plugins: [
	...kit({ css: ['virtual:uno.css'] }),
	unocss(),
]
```

`kit({ css })` inyecta el import virtual en el client entry de Ajo y el plugin
UnoCSS produce la hoja global. `ajo-ui-playa` no necesita un wrapper Vite
propio.

El template en `packages/template` declara `ajo-ui-playa` y UnoCSS, nunca
`ajo-ui`; activa `unocss()`, carga `virtual:uno.css`, configura `playa()` y
renderiza componentes importados por family subpath. Su build client/SSR forma
parte del contrato de aceptacion.

### Nombre y SSR

El nombre `ajo-ui-playa` sigue la convencion de los packages actuales y
coincide con `ssr.noExternal: [/^ajo-/]` de `ajo-kit/vite`. Un nombre scoped
exigiria ampliar esa regla y no aporta Depth al Module. V1 usa
`ajo-ui-playa` sin aliases.

## Mecanica UnoCSS verificada

### Peer dependency

`peerDependencies` declara que un package integra o espera una version de un
host. No es un hook de build. Aunque npm pueda instalar peers, no modifica el
`vite.config.ts`, no agrega `virtual:uno.css` y no fusiona el `uno.config.ts`
de una dependencia.

Consecuencia: un `uno.config.ts` dentro de `node_modules/ajo-ui-playa` seria
inerte salvo que la app lo importe. Exportar un preset es el mecanismo
composable y estandar para cruzar ese Seam.

### Presets

UnoCSS define un preset como una configuracion parcial que se fusiona con la
configuracion principal. Puede aportar la mayor parte de las opciones raiz,
incluyendo nested presets, theme, rules, variants, shortcuts, safelist y
preflights.

La forma final es una funcion creada con `definePreset`:

```ts
// packages/ajo-ui-playa/src/index.ts
import { definePreset } from 'unocss'
import presetIcons from 'unocss/preset-icons'
import presetWind4 from 'unocss/preset-wind4'

/** Returns the complete UnoCSS preset for the Playa theme. */
export const playa = definePreset(() => ({
	name: 'ajo-ui-playa',
	presets: [
		presetWind4(),
		presetIcons({ /* Lucide collection */ }),
	],
	theme,
	rules,
	variants,
	shortcuts,
	safelist,
	preflights,
}))
```

La forma exacta se valido contra los tipos de `66.7.2`. El snippet expresa el
Interface y el ownership, no autoriza exports internos llamados `theme`,
`rules` o `shortcuts`.

### Pipeline extraction

UnoCSS combina tokens obtenidos por pipeline, filesystem e inline content. En
Vite y Webpack, el pipeline es la via mas precisa porque inspecciona modulos
que atraviesan el build y evita I/O adicional.

El include default cubre `.jsx`, `.tsx`, Vue, Svelte, Astro, HTML y formatos
equivalentes. `.js` y `.ts` no se incluyen por defecto. `node_modules` y
`dist` no estan excluidos del pipeline, pero un archivo solo participa si:

1. atraviesa el pipeline del build;
2. coincide con el include configurado;
3. conserva tokens que el extractor puede reconocer.

Por eso source `.tsx` es el camino preferido, pero no una garantia basada solo
en extension. El optimizer de dependencias de Vite puede tratar un package npm
instalado de forma distinta a un workspace symlink; el fixture empacado es
parte del contrato, no una verificacion opcional.

`content.filesystem` ignora `node_modules` por defecto y lo escanea cuando el
glob lo nombra explicitamente. Aunque esta soportado, no es buen Interface de
package: filtra paths internos, depende del layout de npm/pnpm/PnP, escanea el
catalogo completo y obliga a cada app a saber donde vive la Implementation.

### Extraction estatica

UnoCSS genera en build-time. Solo puede garantizar tokens presentes de forma
estatica:

```ts
// Correcto: todas las posibilidades son literales completas.
const sizes = {
	sm: 'h-8 px-3 text-sm',
	lg: 'h-10 px-6 text-base',
}

// Incorrecto: el extractor no conoce los valores runtime.
const size = `h-${value}`
```

El code style actual de Playa ya usa mayormente constantes y maps estaticos.
Ese patron se convierte en invariant de `ajo-ui-playa`.

El `class` que agrega un caller no necesita estar en `ajo-ui-playa`: vive en el
`.tsx` de la app y participa en su propia extraction. Valores recibidos desde
una base, CMS o API siguen siendo dinamicos y pertenecen a la safelist del
owner que controla ese dominio.

### Safelist

Una safelist emite tokens aunque no hayan sido detectados. La documentacion de
UnoCSS la presenta explicitamente como recurso para third-party component
libraries.

Playa debe usarla solamente para:

- un icono cuyo nombre se construye desde un estado cerrado del componente;
- combinaciones finitas que no puedan expresarse como literales completas;
- un token requerido por una selector recipe que el extractor no ve.

No debe duplicar manualmente todas las utilities del source. Si el fixture
demuestra que la extraction de `ajo-ui-playa` publicado no es reliable,
el preset root puede generar una safelist completa desde ese source como
artifact de build y gatear que nunca quede stale. Ese es un fallback medido,
no el diseno inicial.

### Preflights y CSS global

Los preflights globales/estaticos actuales se emiten cuando el preset esta
activo, aunque no se importe una familia concreta. Esto es correcto para
variables `:root`/`.dark` y para invariants globales que sean parte real del
theme, pero hace obligatorio clasificar cada selector actual. UnoCSS permite
preflights condicionales; V1 no introduce esa complejidad sin una medicion que
la justifique.

Cada regla global debe responder una de estas preguntas:

- Es identidad de Playa y debe vivir en los internals del preset root?
- Es necesaria para una familia concreta y puede acotarse por `data-slot`?
- Es una decision de la app y debe quedar fuera del preset?
- Es un reset redundante con Wind4 y debe borrarse?

No se importan dos veces Wind4 ni se ofrecen dos preflights equivalentes. La
app puede superponer configuracion despues de `playa()`, pero el preset no
expone knobs especulativos para cada token.

### Modos UnoCSS no elegidos

Los modos Vite `per-module` y `dist-chunk` estan documentados como
experimentales. No son base adecuada para un contrato que prioriza
reliability. `@unocss/runtime` tampoco corresponde: agregaria parseo,
MutationObserver/DOM work potencial, FOUC y divergencia entre development y
production para resolver un problema que Ajo puede cerrar en build-time.

## Arquitectura y ownership final

| Concern | Owner | Motivo |
|---|---|---|
| Behavior, lifecycle y sensores | `ajo-cloves` | Es independiente del theme |
| Markup, semantica y accesibilidad base | `ajo-ui` | Es la familia unstyled |
| Adapters themed y class literals | family subpaths de `ajo-ui-playa` | Componen las familias base en runtime |
| Tokens, recipes y configuracion Uno de Playa | root e internals de `ajo-ui-playa` | Forman el Adapter del build host |
| Plugin UnoCSS y virtual stylesheet | app/toolchain | Solo el host conoce su build |
| Layout y estilos de producto | app | No son parte del design system |
| Eleccion y literals de iconos internos | family subpaths | Viajan con cada familia themed |
| Coleccion Lucide y safelist de iconos internos | preset root | Se resuelven al generar CSS |
| Iconos de rutas/producto | app | Cambian con el producto |

`ajo-ui-playa` contiene el Module preset y los Modules de familias dentro de un
unico package cohesivo; no es un segundo engine de componentes. Su Interface
contiene un entry root build-time y family subpaths runtime. Cada family Module
conserva una Interface Ajo pequena, compone internamente `ajo-ui` y aplica
clases, recipes o atributos themed. State, markup y accesibilidad siguen abajo.
El root exporta solamente `playa()`.

El grafo interno es unidireccional. El root puede importar internals privados
del preset, UnoCSS y la coleccion Lucide. Los family subpaths pueden importar
`ajo`, `ajo-ui`, `ajo-ui/utils`, `clsx` y siblings runtime privados, pero nunca
el root, `styles.ts`, UnoCSS o Iconify. El root no reexporta componentes. Ese
aislamiento impide que imports runtime arrastren la Implementation build-time
al cliente.

La Implementation se divide por cohesion dentro del mismo package:

```text
packages/ajo-ui-playa/
  package.json
  README.md
  src/
    index.ts                  # root: exporta solamente playa()
    styles.ts                 # preset privado, build-time
    internal/
      recipes.tsx             # recipes runtime compartidas y privadas
      scroll-area.tsx         # frame ScrollArea compartido y privado
    button.tsx
    card.tsx
    modal.tsx                 # sibling runtime privado
    ...
  tests/
```

Estos archivos privados son organizacion de la Implementation, no nuevos
Seams publicos. No se agregan subpaths `ajo-ui-playa/theme`, `/tokens`, `/rules`
o `/shortcuts` sin un segundo consumer real que justifique esa Interface.

Las clases, recipes e icon names forman un protocolo privado entre las dos
ramas de la Implementation. Los tests package-locales generan CSS con
`playa()` para todos los tokens usados por los adapters, y el consumer fixture
repite el contrato desde el tarball real. Asi se verifica el Seam publico sin
convertir theme, rules o shortcuts en exports adicionales.

## Interface publica de `ajo-ui-playa`

### Export map

El export map combina el root build-time y los family subpaths runtime de forma
explicita:

```json
{
  "name": "ajo-ui-playa",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./button": {
      "types": "./src/button.tsx",
      "default": "./src/button.tsx"
    },
    "./card": {
      "types": "./src/card.tsx",
      "default": "./src/card.tsx"
    }
  }
}
```

No se usa wildcard export: los modulos privados actuales como `modal.tsx` y
los tokens compartidos entre siblings no deben convertirse accidentalmente en
Interface publica. El root esta reservado permanentemente para `playa()`; no
existe un root component barrel ni un subpath `./uno`.

Los imports por familia son el camino canonico:

```ts
import Button from 'ajo-ui-playa/button'
import { Card, CardContent } from 'ajo-ui-playa/card'
```

### UnoCSS root

`playa()` es la unica Interface publica de estilos:

```ts
import { playa } from 'ajo-ui-playa'
```

No recibe opciones en V1. Playa es un theme concreto, no un generador de
themes. La configuracion del host puede extender o sobreescribir su resultado
con las reglas normales de UnoCSS.

Agregar opciones sin consumers produciria una Interface shallow: trasladaria
al caller decisiones de prefix, palette, dark selector, icons, layers,
preflights y content que el Module debe resolver una sola vez.

### Dependencies

Forma objetivo:

```json
{
  "dependencies": {
    "@iconify-json/lucide": "1.2.113",
    "ajo-ui": "workspace:*",
    "clsx": "2.1.1"
  },
  "peerDependencies": {
    "ajo": ">=0.1.35",
    "unocss": "66.7.2"
  },
  "devDependencies": {
    "ajo": "0.1.35",
    "unocss": "66.7.2"
  }
}
```

El rango exacto se cierra durante la implementacion contra packages
publicables reales; el snippet registra roles, no una version futura ya
prometida. `workspace:*` es el enlace interno del monorepo: el pack gate debe
confirmar que el manifest publicado lo reescriba a una version concreta y
compatible de `ajo-ui`, sin filtrar el protocolo workspace al consumidor.

- `ajo` es peer porque es el runtime host.
- `ajo-ui` es dependency regular de `ajo-ui-playa`: la capa themed posee su
  base compatible y el package manager la instala transitivamente. No es peer
  ni dependency directa del consumidor.
- UnoCSS es peer porque el root `playa()` es un Adapter para ese host.
- la app declara UnoCSS explicitamente como `devDependency`.
- `@iconify-json/lucide` es dependency de `ajo-ui-playa` porque el preset lo carga
  en build-time.
- `clsx` es dependency runtime de `ajo-ui-playa`.
- `ajo-cloves` no es dependencia directa mientras no exista un import directo.

Todos los exports publicos nuevos reciben una descripcion TSDoc corta para que
el import explique su rol. `playa()` debe dejar claro que es build-time y que
la app debe activar el plugin UnoCSS.

## Contrato del consumidor y DX

### Instalacion

```bash
pnpm add -D unocss
pnpm add ajo-ui-playa
```

El ejemplo parte de una app Ajo, que ya instala `ajo`; un consumer standalone
tambien debe declararlo porque es el runtime host. La app nunca declara ni
importa `ajo-ui` directamente: el package manager lo instala como dependency
transitiva de `ajo-ui-playa`. Esa base es Implementation privada del package
themed y no forma parte de la Interface del consumidor.

### UnoCSS

```ts
// uno.config.ts
import { defineConfig } from 'unocss'
import { playa } from 'ajo-ui-playa'

export default defineConfig({
	presets: [playa()],
	shortcuts: {
		'site-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
	},
	// Solo iconos realmente dinamicos del producto.
	safelist: [],
})
```

### Vite/Ajo

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { kit, jsx } from 'ajo-kit/vite'
import unocss from 'unocss/vite'

export default defineConfig({
	plugins: [
		...kit({ css: ['virtual:uno.css'] }),
		unocss(),
	],
	esbuild: jsx,
})
```

No hay un wrapper `ajo-ui-playa/vite`. Duplicaria la Interface oficial de
UnoCSS, haria mas dificil componer otros presets y mezclaria el package de
theme con el lifecycle de Vite.

### Runtime

```tsx
import Button from 'ajo-ui-playa/button'

export default () => <Button class="w-full">Continue</Button>
```

El source de `Button` en `ajo-ui-playa` aporta sus tokens estaticos; el source
de la app aporta `w-full`; `playa()` desde `ajo-ui-playa` aporta significado,
theme y recipes; el plugin host genera una sola hoja `virtual:uno.css`.

## Contrato de extraction y distribucion

1. Los component subpaths de `ajo-ui-playa` publican `.tsx` source, no `.js`
   compilado.
2. Toda utility finita se escribe como literal completa o dentro de un map de
   literales completos.
3. No se construyen fragments de clases con interpolacion runtime.
4. Los archivos con class literals permanecen `.tsx`. Un `.ts` de
   configuracion puede declarar rules/shortcuts porque Uno lo ejecuta como
   config, no porque lo extraiga.
5. `@unocss-include` no es el contrato general. Depende de que el archivo pase
   por pipeline y de preservar el comentario.
6. No se agrega un include global para todos los `.js`/`.ts`; aumenta falsos
   positivos y CSS accidental.
7. No se usa `content.filesystem` sobre un path interno de `ajo-ui-playa` como
   Interface publica.
8. Los family subpaths de `ajo-ui-playa` son la unidad runtime de import y
   medicion.
9. El root esta reservado al preset: no reexporta componentes, y los family
   subpaths no alcanzan el root ni sus internals build-time.
10. Cambiar el artifact npm de `ajo-ui-playa` a JavaScript invalida este
    contrato y requiere una nueva decision: safelist generada o CSS
    precompilado.

## Split del `uno.config.ts` actual

### Se mueve al preset root de `ajo-ui-playa`

- `presetWind4()`.
- `presetIcons()` y la coleccion Lucide.
- Semantic theme y mappings hacia CSS variables.
- Palette `:root` y `.dark` de Playa.
- Variants `aria-invalid`, `has-aria-invalid` y `pointer-coarse` cuando sean
  requeridas por familias.
- Rules de marker/group, container, scrollbar, motion y animations usadas por
  adapters themed.
- Shortcuts generales del design system como `edge`, `edge-input`, estados de
  edge y `glass-*`.
- Recipes nombradas `playa-*`.
- Preflights `data-slot` de Chart, Drawer, Toast, Attachment y overflow que
  pertenezcan a sus familias.
- Estilos de scrollbar compartidos por `ScrollArea`, `VirtualList`, Menu,
  Select y DataTable.
- Keyframes requeridos por componentes.
- Safelist de iconos o tokens dinamicos internos despues de reducirla a los
  casos no detectables.

Los adapters y sus class literals no se mudan al root ni a `styles.ts`: viven
en los family subpaths del mismo package. El preset define la semantica que
genera el CSS correspondiente.

### Permanece en la app

- `site-container`.
- Iconos de navegacion, dashboard, auth o rutas que no renderice internamente
  una familia Playa.
- Shortcuts de layout del producto.
- Rules, variables o preflights propios de una ruta o demo.
- Cualquier token runtime cuyo owner sea data de producto.

### Se audita antes de asignar

- `button{cursor:pointer}`.
- `input:focus,select:focus,textarea:focus{outline:none}`.
- El default global de `border-color`.
- Animations o icons que tengan hoy consumers tanto de app como de familia.

La auditoria no deja una categoria "shared root" ambigua. Cada selector termina
con un owner o se borra. Si es identidad del theme vive en `ajo-ui-playa`; si es
producto vive en la app; si duplica Wind4 se elimina.

## Alternativas evaluadas

| Modelo | DX consumidor | CSS | Portabilidad | Veredicto |
|---|---|---|---|---|
| Family source + root preset en `ajo-ui-playa` | Preset + plugin | Proporcional a imports bajo el contrato medido | Ajo/Vite/UnoCSS | Elegido y validado con tarball real en `66.7.2` |
| Preset + safelist completa generada | Preset + plugin | Catalogo completo | Toolchains UnoCSS | Fallback reliable si falla pipeline |
| CSS precompilado | Un import CSS | Catalogo completo o varios artifacts | Alta | Futuro solo con consumer real |
| `content.filesystem` a `node_modules` | Config con paths | Catalogo escaneado | Baja | Rechazado como Interface publica |
| Magic comment/include JS | Config o banners | Segun pipeline | Media/baja | Rechazado como contrato central |
| Registry/CLI shadcn-like | CLI copia source | Local a la app | Alta customizacion | Otro producto, no V1 |
| UnoCSS runtime | Poco build config | Generacion browser | Alta | Rechazado por costo y divergencia |

### CSS precompilado

Uno CLI puede escanear source y emitir un `uno.css`; Vite library mode puede
publicar CSS como subpath. Es la opcion mas portable para una libreria npm
tradicional: UnoCSS pasa a ser devDependency de `ajo-ui-playa` y el consumidor
importa `ajo-ui-playa/styles.css`.

No es el mejor primer contrato para Ajo porque:

- emite el catalogo aunque se use una sola familia;
- separa las utilities internas de las utilities del caller;
- obliga a decidir como compartir theme/rules si la app tambien usa UnoCSS;
- puede duplicar Wind4, variables o preflights si se combina con `playa()`;
- crea dos caminos de soporte si se ofrece junto al preset.

Si en el futuro se elige, el artifact vive en `ajo-ui-playa` o en un package CSS
dedicado y reemplaza al modo preset para ese target. No se autoimportan ambos.
Un artifact CSS publicado deja de ser compatible con `sideEffects: false` sin
excepciones: el manifest debe marcar ese CSS como side effect para que el
tree-shaking de un consumidor no lo descarte.

### Safelist completa

Es mas deterministic que extraer una dependencia compilada y esta contemplada
por UnoCSS para librerias de componentes. Sin embargo, una lista manual viola
DRY y puede quedar stale; una lista generada agrega tooling y emite todas las
utilities. Por eso es el fallback preferido si la extraction de source real no
supera el gate, no una capa preventiva "por las dudas".

### Filesystem scan

Un glob como `node_modules/ajo-ui-playa/src/**/*.tsx` funciona en instalaciones
simples y UnoCSS permite nombrar `node_modules` explicitamente. No es robusto
frente a hoisting, symlinks, pnpm stores, Plug'n'Play, cambios de layout o un
dist compilado. Tambien escanea familias no importadas y filtra Implementation
al caller. Se descarta.

### shadcn

shadcn declara que no es una component library: es una plataforma de
distribucion de codigo. Su CLI instala archivos, dependencies y CSS dentro del
workspace consumidor; Tailwind ve source local porque el source fue copiado.

Replicarlo implicaria disenar registry schema, merge de configuracion, CLI,
ownership de upgrades y conflictos locales. Puede ser valioso para otra etapa,
pero no resuelve el contrato de un package npm centralmente actualizable.

### `content` dentro de presets

UnoCSS core incorporo merge de content aportado por presets. No se usa como
fundamento de V1: la integracion Vite decide que modulos pasan por pipeline,
el optimizer puede prebundlear una dependencia y no existe una
receta documentada que elimine la necesidad de un consumer fixture real. El
preset de Playa aporta config; la extraction preferida viene del pipeline de
source `.tsx`.

## Invariants de arquitectura

1. `ajo-ui` sigue usable sin `ajo-ui-playa` y sin UnoCSS.
2. `ajo-cloves` no conoce el package de theme.
3. `ajo-ui-playa` compone `ajo-ui`; nunca replica su state o markup.
4. `ajo-ui` es dependency transitiva de `ajo-ui-playa`; una app themed no lo
   declara ni lo importa directamente.
5. El root de `ajo-ui-playa` exporta solamente `playa()` y es el unico Seam de
   configuracion visual; los componentes existen solo en family subpaths.
6. La closure de un family subpath no alcanza el root, `styles.ts`, UnoCSS,
   presetWind4/Icons o Lucide. El root no reexporta componentes.
7. La app activa UnoCSS una vez y carga una sola hoja virtual.
8. Wind4 e Icons se configuran una vez, dentro de `playa()`.
9. No hay config oculta descubierta desde `node_modules`.
10. No hay UnoCSS runtime ni import de config en el browser.
11. No hay dos pipelines de estilos al cerrar el corte.
12. Las classes de `ajo-ui-playa` son estaticamente enumerables.
13. Los internals entre siblings siguen privados por export map.
14. CSS/tree-shaking se afirma solo con evidencia del tarball real.
15. Compilar los family subpaths de `ajo-ui-playa` a `.js` reabre formalmente
    el contrato de extraction.
16. La compatibilidad entre class literals y recipes se versiona y prueba en
    el mismo package y release.

## Superficie implementada

La implementacion afecta estas areas:

| Area | Estado actual |
|---|---|
| `packages/ajo-ui-playa/` | Package de adapters, preset, export map explicito, tests y README |
| `src/ui/` | Eliminado sin shim ni alias |
| `uno.config.ts` | Queda app-only y consume `playa()` |
| `vite.config.ts` | Conserva UnoCSS + `virtual:uno.css`; no gana wrapper Playa |
| `package.json` de app | Reemplaza la dependency runtime directa `ajo-ui` por `ajo-ui-playa` y retira tooling cuyo owner pasa al preset |
| `pnpm-workspace.yaml` | Registra el nuevo package |
| `pnpm-lock.yaml` | Refleja el nuevo grafo y peers |
| `src/**` | Cambia imports themed a subpaths de `ajo-ui-playa` |
| `tests/stories/**` | Cambia imports y sigue como integration catalog |
| `packages/ajo-ui-playa/tests` | Recibe tests de preset, adapters, exports, grafo y composicion |
| `tests/playa-consumer.ts` | Publica la cadena en un registry efimero y prueba root build-time + family subpaths runtime |
| `packages/template/**` | Integra el setup minimo themed |
| `packages/ajo-kit/src/vite.ts` | Sin cambio: Phase 0 no requirio exclusion ni wrapper Playa |
| Docs | Actualiza package seams y paths, sin duplicar este plan |

Tambien se revisa `packages/ajo-ui/README.md`: debe describir una base
unstyled consumida por themes y dejar de apuntar a `src/ui` como ubicacion
permanente. Debe quedar explicito que `ajo-ui-playa` la posee como dependency
transitiva y que las apps no la declaran ni importan directamente. No se cambia
la Interface de `ajo-ui` por el mero movimiento.

## Plan implementado

Las Phases 0-4 estan completas. Sus pasos permanecen como contrato auditable de
la implementacion; no representan trabajo activo ni aliases publicos.

### Phase 0 - Baseline y consumer spike (`complete`)

Objetivo: validar la hipotesis de extraction antes de mover 63 adapters.

1. Registrar la version exacta de UnoCSS, Vite, Ajo y package manager.
2. Medir el CSS actual de una app/stories representativa: raw, gzip y brotli si
   el toolchain ya lo expone.
3. Registrar el JS cliente actual y confirmar que UnoCSS/Iconify no son
   runtime dependencies.
4. Crear un package de spike empacable con root `playa()`, un component
   subpath `.tsx`, Wind4, un shortcut, una custom rule/variant, un icono y un
   preflight.
5. Empaquetar y publicar la cadena Ajo todavia local (`ajo-cloves`, `ajo-ui` y
   `ajo-ui-playa`) en un registry local efimero de tests, en orden de
   dependencia. Este registry es infraestructura descartable, no una Interface
   ni el registry/CLI de producto descartado para V1.
6. Instalar `ajo-ui-playa` por version desde ese registry en un fixture fuera
   del workspace, nunca mediante `workspace:*` ni symlink. El manifest del
   fixture declara `ajo-ui-playa`, `ajo` y UnoCSS, pero deliberadamente no
   declara `ajo-ui`.
7. Probar import por subpath en dev, HMR, client production build y SSR build.
8. Bundlear root y component subpath por separado: el subpath no retiene
   preset/UnoCSS/Iconify y el root no recorre Ajo ni el catalogo de familias.
9. Agregar un sentinel de una familia no importada y verificar si aparece.
10. Si dev prebundle oculta source, repetir el fixture con
   `optimizeDeps.exclude: ['ajo-ui-playa']` y verificar production por separado:
   `optimizeDeps` es una decision de desarrollo, no del build Rollup.
11. Decidir con evidencia:
   - pipeline `.tsx` sin config adicional si pasa todos los casos;
   - una regla minima del toolchain Ajo si `optimizeDeps.exclude` restaura el
     mismo contrato sin acoplar cada app a internals;
   - safelist generada si el optimizer/pipeline sigue siendo divergente o la
     regla Vite requiere una Interface mas costosa que el CSS que ahorra.

Exit gate:

- existe un fixture reproducible desde el tarball real;
- el install externo resuelve `ajo-ui` y `ajo-cloves` transitivamente desde el
  registry efimero sin agregarlos al manifest del fixture;
- se conoce si el CSS es realmente on-demand;
- el modo elegido funciona igual en dev y production;
- no se inicia el movimiento si el mecanismo de extraction sigue ambiguo.

### Phase 1 - Crear el deep Module `ajo-ui-playa` (`complete`)

Objetivo: extraer la configuracion sin mover aun las familias.

1. Agregar `packages/ajo-ui-playa` al workspace.
2. Crear `package.json`, README, `src/index.ts` e internals privados de estilos;
   el manifest declara `ajo-ui` como dependency regular y `ajo`/UnoCSS como
   peers.
3. Convertir el config themed en `playa()` con `definePreset`.
4. Importar Wind4 e Icons desde el peer UnoCSS y Lucide desde dependency.
5. Clasificar todos los icons actuales entre component y product ownership.
6. Clasificar todos los preflights, rules, variants y shortcuts actuales.
7. Hacer que el `uno.config.ts` raiz consuma `playa()` y conserve solo app
   config.
8. Borrar las definiciones duplicadas del root en el mismo corte.
9. Retirar del root `@unocss/preset-icons`, `@unocss/preset-wind4` y
   `@iconify-json/lucide` cuando ya no tengan consumers de producto; el lockfile
   debe reflejar sus nuevos owners.
10. Agregar tests directos con `createGenerator` a traves de `playa()`.

El test del preset debe demostrar como minimo:

- utility Wind4;
- semantic theme token;
- shortcut general;
- recipe `playa-*`;
- custom variant;
- custom rule;
- component icon;
- root/dark variables y un preflight `data-slot`;
- ausencia de iconos o shortcuts clasificados como app-only.

Exit gate:

- la app y stories conservan su salida visual;
- el root config ya no duplica Playa;
- tests usan solo `playa()`, no internals;
- no entra UnoCSS/Iconify al bundle cliente.

### Phase 2 - Mover los adapters themed (`complete`)

Objetivo: reemplazar `src/ui` por `ajo-ui-playa` sin camino paralelo.

1. Inventariar exports publicos, defaults, types y dependencies entre siblings.
2. Mover las 63 familias `.tsx` al package creado en Phase 1.
3. Mantener tokens shared privados (`modal`, recipes de Menu, InputGroup,
   ScrollArea y otros) fuera del export map cuando solo los usan siblings.
4. Preservar imports internos a `ajo-ui/<family>` y `ajo-ui/utils`; esos paths
   no se filtran a app, stories ni documentacion de consumo.
5. Agregar export map explicito por familia; el root conserva exclusivamente
   `playa()` y no se convierte en component barrel.
6. Agregar contract tests de root, exports permitidos y subpaths rechazados.
7. Cambiar app, stories y tests de adapters themed a imports de
   `ajo-ui-playa/<family>`.
8. Reubicar en `packages/ajo-ui-playa/tests` los tests cuyo owner sea el
   Adapter themed o su superficie publica; conservar stories como integration
   catalog.
9. Mantener los contract tests de la base bajo ownership de `packages/ajo-ui` o
   de un harness de desarrollo; nunca convertir su dependencia test-only en
   requisito de una app.
10. Retirar `ajo-ui` de las runtime dependencies del root consumidor. Si el
    harness monorepo todavia lo necesita para contract tests base, declararlo
    solo como devDependency del owner de esos tests hasta localizarlos.
11. Borrar `src/ui` y sus aliases en el mismo corte.
12. Buscar referencias residuales a `/src/ui`, `../src/ui` y `src/ui`, y
    rechazar imports directos de `ajo-ui` desde app, stories, template o tests
    themed.
13. Gatear desde el consumer fixture que `playa()` genere CSS para todos los
    tokens estaticos usados por los adapters.
14. Bundlear un family subpath y el root por separado para verificar el
    aislamiento bidireccional del export graph.

Exit gate:

- no existe una segunda copia themed;
- todos los imports cruzan subpaths intencionales;
- private modules no son importables;
- app, tests y stories consumen el mismo `ajo-ui-playa` que consumiria npm;
- ningun manifest de app o template declara `ajo-ui` directamente;
- CSS y JS se mantienen dentro de los budgets fijados desde baseline.

### Phase 3 - Integrar el DX de una app nueva (`complete`)

Objetivo: que el sistema parezca disenado como una pieza.

1. Agregar `ajo-ui-playa` como dependency y UnoCSS como devDependency del
   template elegido; no agregar `ajo-ui` al manifest del template.
2. Agregar el `uno.config.ts` minimo con `playa()`.
3. Activar `unocss()` y `virtual:uno.css` en su `vite.config.ts`.
4. Crear una pagina template que importe componentes por subpath.
5. Actualizar `readme.md`, `ai/ui.md`, `ai/architecture.md`, `AGENTS.md` y
   `ai/LLMs.md` con los nuevos package seams.
6. Actualizar los paths themed de cada familia en `ai/ui.md` y `ai/plan.md` sin
   copiar este documento en ellos.
7. Documentar el ownership de app shortcuts e iconos.
8. Documentar el invariant de class literals y la politica de subpaths.
9. Generar e inspeccionar el tarball y su packlist.

Exit gate:

- una app creada desde template compila sin conocer internals de Playa;
- su manifest no declara `ajo-ui` y la base llega transitivamente;
- el setup publico tiene una sola llamada `playa()`;
- docs y package exports coinciden;
- no se requiere copiar config manual desde el repo principal.

### Phase 4 - Hardening y acceptance (`complete`)

Objetivo: cerrar el package, el build y la publicacion con evidencia real.

1. Publicar la cadena local en el registry efimero y ejecutar el fixture con la
   implementacion final empaquetada, sin enlaces workspace.
2. Verificar HMR al cambiar un class literal de `ajo-ui-playa` en desarrollo
   local.
3. Verificar client build, SSR build y production smoke.
4. Inspeccionar CSS para utility, shortcut, rule, variant, icon y preflight.
5. Verificar que un sentinel no usado no aparezca si se promete on-demand.
6. Inspeccionar por separado el grafo build-time del root y el grafo runtime de
   un family subpath.
7. Verificar que UnoCSS, preset code y Lucide JSON no aparezcan en JS cliente.
8. Probar la resolucion y el diagnostico del package manager ante peers
   ausentes o incompatibles, y que el config import falle cuando su host real
   no esta disponible.
9. Verificar que el consumer fixture no declare ni importe `ajo-ui`, y que el
   tarball lo resuelva como dependency transitiva usando la misma identidad de
   `ajo` del host.
10. Ejecutar stories visuales en light/dark y familias con popup/scrollbar.
11. Fijar budgets de JS y CSS desde las mediciones finales.
12. Revisar `npm pack --dry-run`/equivalente y exports del tarball.

Exit gate:

- todos los invariants de este documento tienen test o evidencia inspeccionada;
- dev y production producen comportamiento equivalente;
- SSR no importa el Adapter build-time en runtime;
- no hay claims de performance sin medicion;
- `ajo-ui-playa` queda publicable como un deep Module cohesivo con root
  build-time y family subpaths runtime aislados.

### Phase 5 futura - Toolchains no Ajo (`deferred`)

No se implementa sin un consumer real. Si aparece una app que no puede o no
debe usar UnoCSS, comparar nuevamente:

- `ajo-ui-playa/styles.css` precompilado;
- package separado de CSS;
- registry/CLI que copie source;
- un adapter para otro build tool.

La nueva evidencia decide un reemplazo o un segundo adapter justificado. Un
adapter hipotetico no merece ampliar hoy la Interface.

## Matriz de validacion

| Gate | Que protege | Evidencia requerida |
|---|---|---|
| Preset unit | Semantica de `playa()` | CSS de utility, shortcut, rule, variant, icon y preflight |
| Export contract | Interface publica | Root solo `playa()`; family subpaths explicitos; internals rechazados |
| Visual protocol | Consistencia interna | Todo token de adapters genera CSS con `playa()` |
| Tarball consumer | Realidad npm | Instalacion por version desde registry efimero, fuera del workspace |
| Dev/HMR | Pipeline incremental | Cambio visible sin restart incorrecto |
| Client build | CSS y JS productivos | Artifacts inspeccionados y budgets |
| SSR build | Separacion build/runtime | Render y bundle sin config cliente |
| Stories | Integracion de familias | Smoke completo y visual light/dark |
| Sentinel CSS | Claim on-demand | Ausencia de recipe no importada |
| Export graph | Aislamiento build/runtime | Subpath sin preset; root sin catalogo runtime |
| Packlist | Publicacion | Solo archivos y exports intencionales |
| Peer matrix | Compatibilidad host | Versiones soportadas y fallos controlados |
| Base encapsulation | DX e identidad runtime | Fixture sin `ajo-ui` directo; base transitiva y un solo `ajo` host |

Comandos base del repo:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm stories:test
pnpm stories:test:visual
pnpm test:e2e
pnpm build
pnpm test:prod
```

A esos gates se agregan los tests package-locales de `ajo-ui-playa`, el
consumer fixture desde el tarball y un bundle/CSS script reproducible. No se
reemplaza el fixture real por un test que importe `workspace:*`.

### Evidencia final reproducible

- `pnpm --filter ajo-ui-playa test`: 12 archivos y 36 tests package-locales,
  incluido el build client/SSR real del template.
- `pnpm test:consumer:playa`: publica `ajo-cloves`, `ajo-ui` y
  `ajo-ui-playa@0.1.0` en un registry efimero; verifica peer matrix, import sin
  host UnoCSS, typecheck del source publicado, base transitiva, identidad Ajo,
  client/SSR, los 1,184 tokens runtime, CSS, grafos, budgets y HMR sobre una
  copia temporal del package.
- `pnpm stories:test`: manager smoke y 481 stories.
- `pnpm stories:test:visual`: manager smoke y 481 stories en light/dark, con
  962 screenshots separados por theme.
- `pnpm test:e2e`: 49 escenarios browser.
- `pnpm test:prod`: build client/SSR y production smoke.
- `pnpm exec tsc --noEmit`, `pnpm test:unit`, `pnpm build` y el build del
  template tambien pasan sobre el corte final.

Baseline client previo: CSS 210,060 B raw / 26,775 B gzip / 22,001 B brotli;
34 chunks JS sumaban 178,050 B raw. Build final: CSS 123,778 B raw / 18,440 B
gzip / 15,224 B brotli; 53 chunks JS suman 178,383 B raw. La reduccion CSS es
aproximadamente 41.1% raw, 31.1% gzip y 30.8% brotli. El JS raw permanece
practicamente neutro (+0.2%); no se interpreta la suma comprimida de chunks
separados como mejora. UnoCSS, Iconify y Lucide JSON permanecen fuera del JS
cliente.

El consumer minimo fija budgets ejecutables de 48,000 B raw / 9,000 B gzip /
8,000 B brotli para CSS y 12,000 B raw / 4,500 B gzip / 4,000 B brotli para JS.
La medicion de cierre es 41,719 / 7,784 / 6,928 B para CSS y 9,845 / 3,709 /
3,375 B para JS, respectivamente.

## Performance y bundle contract

- Cero runtime UnoCSS.
- Cero JSON de Lucide en client JS.
- Cero codigo del preset root o sus internals build-time en el grafo cliente.
- Cero costo runtime del catalogo para una app que importa solo el root
  build-time y ningun family subpath.
- Subpaths de `ajo-ui-playa` como unidad de medicion.
- CSS proporcional a imports solo si el sentinel gate lo prueba.
- Sin filesystem scan completo de `node_modules`.
- Sin safelist completa salvo fallback medido y generado.
- Preflights globales medidos separadamente de utilities on-demand.
- Raw, gzip y brotli reportados; ningun budget se inventa antes del baseline.
- Comparacion dev/production para evitar una falsa extraction que solo funcione
  por HMR o DevTools.

El costo del root `playa()` ocurre en build-time. El budget cliente mide la app
y los family subpaths runtime importados, no el preset ni las dependencias del
grafo de tooling.

## Riesgos y mitigaciones

### Vite prebundle oculta source

Riesgo: una dependencia npm puede optimizarse a JavaScript antes de que el
pipeline UnoCSS vea sus `.tsx`.

Mitigacion: el fixture con tarball real en Phase 0 probo el pipeline directo;
no confiar en un symlink ni agregar configuracion preventiva. Un cambio que
rompa ese fixture reabre la decision y compara entonces una regla local del
toolchain Ajo contra una safelist exacta generada.

### Publicacion futura de family subpaths a `.js`

Riesgo: publicar los family subpaths como `.js` deja sus class literals fuera
del include default.

Mitigacion: source `.tsx` es invariant de V1. Un cambio de formato falla el
fixture y reabre la decision antes de publicar.

### El root recorre el catalogo runtime

Riesgo: si el root reexporta o importa family modules, el config build-time
puede recorrer todo el catalogo y UnoCSS puede ver componentes no usados.

Mitigacion: el root exporta solo `playa()` e importa solo internals del preset.
Un graph test verifica que no alcance Ajo, `ajo-ui`, `clsx` ni familias `.tsx`.

### Duplicacion de presets o preflights

Riesgo: la app y el preset root de `ajo-ui-playa` configuran Wind4/Icons o
variables dos veces.

Mitigacion: `playa()` es completo; root app config conserva solo producto.
Tests inspeccionan duplicados y cascade.

### Config precedence

Riesgo: overrides de la app cambian invariants del theme de forma silenciosa.

Mitigacion: documentar que config del caller se fusiona despues de presets,
testear tokens criticos y mantener pequena la superficie sobreescribible.

### Iconos dinamicos

Riesgo: nombres construidos runtime desaparecen en production.

Mitigacion: literals estaticos en los family subpaths cuando sea posible;
safelist package-local para component icons y app-local para product icons.

### Identidad del runtime Ajo y encapsulacion de la base

Riesgo: dos copias de `ajo` rompen context identity, o la app empieza a depender
directamente de `ajo-ui` y filtra la base unstyled a su Interface.

Mitigacion: `ajo` sigue como peer de `ajo-ui-playa` y de `ajo-ui`; `ajo-ui` es
una unica dependency transitiva poseida por `ajo-ui-playa`. Docs, template y
fixture no la declaran ni importan. El fixture usa un package manager real,
inspecciona el grafo y prueba context composition.

### Build-time code llega al cliente

Riesgo: un family module importa el root o `styles.ts` y retiene
UnoCSS/Iconify en el grafo runtime.

Mitigacion: export map explicito, grafo interno unidireccional,
`sideEffects: false`, regla de imports y bundle test de un family subpath.

### Nombre scoped

Riesgo: nombres scoped alternativos no coinciden con
`ssr.noExternal: [/^ajo-/]` actual.

Mitigacion: usar `ajo-ui-playa` en V1. Si cambia el naming global, actualizar
el matcher y cubrir el package con el SSR fixture en el mismo corte.

### Drift entre config y source

Riesgo: una safelist o recipe deja de representar las clases reales de los
family subpaths.

Mitigacion: un unico package versiona ambos lados y un contract test cubre
todos los tokens de los adapters. Si existe un artifact generado, CI lo
regenera y falla ante diff.

## Politica de versiones y upgrades

- Baseline: UnoCSS `66.7.2`, Vite `8.0.16`.
- El repo fija versiones exactas para reproducibilidad.
- El peer UnoCSS expresa solo el rango validado por fixtures.
- Un upgrade UnoCSS es atomico: peer/devDependency, preset, tarball, CSS diff,
  stories, SSR/client build y budgets en un solo corte.
- Un cambio de tokens, recipes o class literals versiona y verifica el package
  en el mismo corte.
- No se declara compatible una version por semver solamente.
- Cambios en includes, presets, preflights o optimizer se tratan como cambios
  de comportamiento aunque TypeScript compile.

## Decisiones cerradas

1. El unico package themed se llama `ajo-ui-playa`.
2. `ajo-ui-playa` vive encima de `ajo-ui`, no dentro de `ajo-ui` ni
   `ajo-cloves`.
3. `ajo-ui` es dependency interna y transitiva de `ajo-ui-playa`; las apps no
   lo declaran ni lo importan directamente.
4. Publica adapters como source `.tsx` mediante family subpaths explicitos.
5. El root exporta solamente `playa()`; no existe component barrel ni
   `ajo-ui-playa/uno`.
6. La Interface del Adapter build-time es `playa()` sin opciones en V1.
7. La app activa UnoCSS y consume el preset explicitamente con
   `import { playa } from 'ajo-ui-playa'`.
8. UnoCSS es peer + devDependency de test, nunca runtime cliente.
9. Wind4, Icons, theme, rules, variants, shortcuts y preflights de Playa viven
   detras del preset.
10. Product config permanece en la app.
11. No se usan globs de `node_modules` como contrato publico.
12. No se publica CSS precompilado en paralelo.
13. No se crea un registry/CLI de distribucion de producto en esta feature; el
    registry efimero existe solo dentro del test de packaging.
14. El claim on-demand depende de un fixture verde con el tarball real.

## Decisiones cerradas por evidencia

1. El pipeline consume directamente los family subpaths `.tsx` instalados; no
   se agrega `optimizeDeps.exclude` ni safelist completa.
2. El peer UnoCSS queda exacto en `66.7.2`, la version probada por el fixture.
3. Cualquier upgrade o cambio del artifact reabre ambas decisiones y debe pasar
   dev, client build, SSR, sentinel y export graph antes de publicarse.

## Fuentes primarias

### UnoCSS

- Extracting, pipeline, filesystem, inline content, static limitations y magic
  comments: <https://unocss.dev/guide/extracting>
- Config completa, filtros de pipeline y comportamiento de `node_modules`:
  <https://unocss.dev/config/>
- Authoring y consumo de presets: <https://unocss.dev/config/presets>
- Safelist y third-party component libraries:
  <https://unocss.dev/config/safelist>
- Vite plugin, virtual stylesheet, modes y HMR:
  <https://unocss.dev/integrations/vite>
- Vite dependency pre-bundling y linked dependencies:
  <https://vite.dev/guide/dep-pre-bundling.html>
- CLI y generacion de CSS precompilado:
  <https://unocss.dev/integrations/cli>
- Wind4: <https://unocss.dev/presets/wind4>
- Svelte scoped component-library precedent:
  <https://unocss.dev/integrations/svelte-scoped>
- Core support para content en presets:
  <https://github.com/unocss/unocss/pull/4041>

### Packaging y comparables

- npm `peerDependencies`:
  <https://docs.npmjs.com/files/package.json/#peerdependencies>
- Vite library-mode CSS exports:
  <https://vite.dev/guide/build.html#css-support>
- shadcn introduction y modelo Open Code:
  <https://ui.shadcn.com/docs>
- shadcn monorepo/source distribution:
  <https://ui.shadcn.com/docs/monorepo>
- shadcn registry:
  <https://ui.shadcn.com/docs/registry>

## Conclusion

El problema no se resuelve haciendo a UnoCSS peer y esperando discovery
automatico. Se resuelve colocando un Seam build-time explicito en el root de
`ajo-ui-playa`: `playa()` ensena al generator del host toda la semantica visual,
mientras los `.tsx` importados desde `ajo-ui-playa` aportan los tokens usados.
La app conserva solo su build y su producto.

El diseno produce un deep Module: los family subpaths concentran los Adapters
runtime y el root concentra toda la Implementation UnoCSS detras de una sola
funcion. El export map y los bundle tests mantienen ambas ramas aisladas dentro
del mismo tarball y version. El fixture decide si la extraction puede ser
verdaderamente on-demand; el sistema no afirma esa propiedad antes de medirla
ni introduce un segundo pipeline preventivo.
