# ajo-backup

SQLite backup to Google Drive with WAL-based incremental sync.

Watches your database's WAL file for changes, debounces uploads, and periodically rotates full snapshots. Pulling restores both snapshot and WAL for minimal data loss.

## Install

```bash
pnpm add ajo-backup better-sqlite3
```

> `better-sqlite3` is a peer dependency — your app must install it directly.

## Getting Started

### 1. Create Google Drive credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services → Library** → Enable **Google Drive API**
3. **APIs & Services → OAuth consent screen** → Add yourself as test user
4. **APIs & Services → Credentials** → Create **OAuth client ID** (Desktop app)
5. Save to `drive.json`:

```json
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

### 2. Authorize

```bash
npx backup auth
```

Opens a browser flow. On success, `refresh_token` is saved to `drive.json`.

### 3. Create a Drive folder

Create a folder in Google Drive for backups. Copy the folder ID from the URL:

```
https://drive.google.com/drive/folders/FOLDER_ID
```

### 4. Push

```bash
# One-time snapshot
npx backup push -f FOLDER_ID

# Continuous sync (watches WAL for changes)
npx backup push -f FOLDER_ID --watch
```

### 5. Pull

```bash
npx backup pull -f FOLDER_ID -o ./database.sqlite
```

## Environment Variables

All CLI flags can be set via `.env` (loaded automatically via `dotenv`):

```env
DRIVE_CREDENTIALS=./drive.json
DRIVE_FOLDER=your_folder_id
DATABASE_PATH=./database.sqlite
```

## CLI Reference

```
backup auth [options]
  -c, --credentials  Path to credentials JSON  (default: ./drive.json)
  -p, --port         Local callback port        (default: 3000)

backup push [options]
  -b, --database     Path to SQLite database     (default: ./database.sqlite)
  -c, --credentials  Path to credentials JSON    (default: ./drive.json)
  -f, --folder       Google Drive folder ID      (required)
  -s, --snapshot     Snapshot file name in Drive  (default: snapshot.db)
  -n, --name         WAL file name in Drive       (default: changes.wal)
  -w, --watch        Watch for changes continuously
  -r, --rotate       Rotation interval in hours   (default: 6)
  -d, --debounce     Debounce delay in ms         (default: 1000)

backup pull [options]
  -c, --credentials  Path to credentials JSON    (default: ./drive.json)
  -f, --folder       Google Drive folder ID      (required)
  -s, --snapshot     Snapshot file name in Drive  (default: snapshot.db)
  -n, --name         WAL file name in Drive       (default: changes.wal)
  -o, --output       Output database path         (default: ./database.sqlite)
```

## Library Usage

For programmatic use, import `drive` and `push` directly:

```ts
import Database from 'better-sqlite3'
import { drive, push } from 'ajo-backup'

const db = new Database('./database.sqlite')
db.pragma('journal_mode = WAL')

const client = drive({
  credentials: './drive.json',
  folder: 'FOLDER_ID',
})

const syncer = push({
  database: db,
  snapshot: (path) => client.upload(path, 'snapshot.db'),
  changes: (path) => client.upload(path, 'changes.wal'),
  clear: () => client.remove('changes.wal'),
})

// One-time snapshot + WAL upload
await syncer.once()

// Or continuous sync
const { stop, rotate } = syncer.start()
// ... later:
await stop()
```

> **Important:** The database must use WAL journal mode. The CLI sets this automatically; when using the library, call `db.pragma('journal_mode = WAL')` before passing the instance to `push()`.

## How It Works

1. **Watch** — Monitors the `-wal` file for changes via `fs.watch`
2. **Debounce** — Waits for write activity to settle before uploading
3. **Upload** — Copies WAL to a temp file and uploads to Drive
4. **Rotate** — Every 6 hours (configurable), truncates WAL and uploads a fresh full snapshot
5. **Pull** — Downloads snapshot + WAL, which SQLite replays on next open
