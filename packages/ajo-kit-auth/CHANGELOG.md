# ajo-kit-auth

## 0.5.0

### Minor Changes

- Add exact-subject API tokens with a 90-day maximum lifetime and current account/team authorization. token.create now takes an options object as its fourth argument; token.revoke requires the owner and full stored id. Migration 0006 adds subject metadata and revokes scoped credentials before rollback removes it.

### Patch Changes

- Updated dependencies:
  - ajo-kit@0.2.0
