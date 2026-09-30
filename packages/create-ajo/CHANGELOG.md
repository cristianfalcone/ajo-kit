# create-ajo

## 0.1.0

### What Is New

- First release. `pnpm create ajo <dir>` copies the ajo-kit starter shipped in
  the package into a new or empty `<dir>`, sets `name` in its `package.json` to
  the directory name, runs `git init -b main` when Git is installed and `<dir>`
  is not inside a repository, then `pnpm install` and
  `node scripts/setup.mjs`, which writes a private `.env` with a random
  `APP_SECRET` and applies the migrations. It prints
  `cd <dir> && pnpm kit dev`.
- No prompts and no options besides `--json`, which prints one document on
  stdout. Failures carry the codes `usage`, `target_exists`, `install_failed`
  and `internal`.
- The starter is a private notebook with registration, sessions and CSRF,
  SQLite migrations, owner-scoped notes, live updates, optional verified
  email and Playa with its fonts. It carries `ajo-kit-server`, so
  `pnpm kit deploy` deploys it once it has a host, and pins every Ajo package
  to this release: `ajo` 0.2.0, `ajo-kit` 0.5.0, `ajo-kit-auth` 0.7.1,
  `ajo-kit-mail` 0.4.1, `ajo-ui-playa` 0.3.0, `ajo-kit-server` 0.3.0, and the
  engine pair as exact optional dependencies.
- Requires Node 22.18 or newer and pnpm.
