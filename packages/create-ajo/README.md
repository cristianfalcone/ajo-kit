# create-ajo

Creates an Ajo App from the ajo-kit starter.

```sh
pnpm create ajo notes
cd notes
pnpm kit dev
```

`pnpm create ajo <dir>` needs Node 22.18 or newer and pnpm. `<dir>` must be new
or empty. It then:

1. copies the starter into `<dir>` and sets `name` in its `package.json` to the
   directory name;
2. runs `git init -b main` when Git is installed and `<dir>` is not already
   inside a repository;
3. runs `pnpm install`, then `node scripts/setup.mjs`, which writes a private
   `.env` with a random `APP_SECRET` and applies the migrations.

The starter is a private notebook with registration, sessions and CSRF, SQLite
migrations, owner-scoped notes, live updates, verified email and Playa, and
carries `ajo-kit-server`, so `pnpm kit deploy` deploys it once it has a host. Its
README covers the application, tests, sealing and the first deploy. Every Ajo
package in it is pinned to the release this version of `create-ajo` was
published with.

There are no prompts and no options besides `--json`. Progress goes to stderr.
With `--json`, stdout holds one document: `{ "ok": true, "result": { "directory",
"name" }, "next" }`, or `{ "ok": false, "error": { "code", "message" }, "next" }`
with exit status 1.

| Code | When |
|---|---|
| `usage` | `<dir>` is missing, or there is another argument or option |
| `target_exists` | `<dir>` is a file or a non-empty directory |
| `install_failed` | `git init`, `pnpm install` or the setup failed; `next` says how to finish in `<dir>` |
| `internal` | Anything else, with its stack on stderr |
