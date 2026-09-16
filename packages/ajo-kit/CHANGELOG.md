# ajo-kit

## 0.3.2

### Patch Changes

- Support host-managed request origins and deterministic engine metadata from explicitly declared plugins.

## 0.3.1

### Patch Changes

- Preserve fragment navigation after route rendering and handle loader failures without unhandled parent promise rejections.

## 0.3.0

### Minor Changes

- Remove the unused build check option; keep engine graph validation mandatory for every build.

## 0.2.1

### Patch Changes

- Create the compiler output parent on the first kit build and document installed package aliases and Ajo form events.

## 0.2.0

### Minor Changes

- Require nullable Request.token.subject metadata for subject-aware bearer authorization. Upgrade ajo-kit-auth to 0.5.0 together with this release.
