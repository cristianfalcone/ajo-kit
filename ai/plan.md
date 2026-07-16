# Active Plan

## Tracking Guidelines

- `ai/plan.md` contiene solo el trabajo activo, su estado actual, evidencia,
  proximo checkpoint y bloqueos. No conserva historia de features terminadas.
- El documento tecnico canonico correspondiente contiene solo arquitectura,
  contratos, invariantes y estado tecnico vigente; este archivo solo lo
  convierte en ejecucion y no duplica su contenido.
- Codigo, manifests, artifacts empacados y tests son la autoridad final. Si la
  evidencia cambia una decision, actualizar primero el documento canonico y
  luego este tracker.
- Estados permitidos: `pending`, `active`, `blocked`, `complete` y `deferred`.
  Solo puede existir una phase y una slice `active` a la vez.
- Al cerrar una slice, actualizar juntos: checklist, evidencia exacta, estado,
  cobertura no ejecutada, proxima slice y next checkpoint.
- `complete` requiere su exit gate verificado; compilar no sustituye gates de
  packaging, CSS, SSR, browser, accesibilidad o performance.
- Implementar slices pequenas y honestas. No dejar aliases, shims, caminos
  paralelos ni estados intermedios como Interface publica.
- Antes de editar, verificar identidad del repo y preservar cambios ajenos. No
  stagear ni revertir trabajo fuera de la slice.

## Status

- **Active feature:** none.
- **Active phase:** none.
- **Active slice:** none.
- **Blockers:** none.
- **Next checkpoint:** activar aqui la proxima feature desde su documento
  tecnico canonico.

## Activation Template

Al activar una feature, reemplazar `Status` y agregar solamente:

1. objetivo y resultado observable para el consumer;
2. alcance, no objetivos y constraints;
3. contrato arquitectonico que no puede romperse;
4. phase tracker y una unica slice activa;
5. exit gate, evidencia actual y comandos reales de verificacion;
6. proximo checkpoint, bloqueos y handoff inmediato.

Al completar la feature, consolidar solo el estado tecnico vigente en su
documento canonico y volver este archivo a la estructura vacia anterior. No
conservar aqui investigacion, alternativas, fases cerradas ni historia.
