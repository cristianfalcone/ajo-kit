# ajo-backup

SQLite backup to Google Drive with WAL-based incremental sync.

This package does not ship a standalone CLI binary. It extends the `kit` CLI via plugin discovery (`package.json#kit.commands`), so commands are run as `kit backup ...`.

## Install

```bash
pnpm add ajo-backup
```

Prerequisites:

- `ajo-kit` in the app (provides `kit` CLI)
- `tsx` available in the project (required by `kit`)

## Setup

### 1. Create Google Drive OAuth credentials

1. Google Cloud Console -> APIs & Services -> Library -> enable **Google Drive API**
2. APIs & Services -> OAuth consent screen -> add your account as a test user
3. APIs & Services -> Credentials -> create **OAuth client ID** (Desktop app)
4. Save credentials to `drive.json`:

```json
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

### 2. Authorize once

```bash
kit backup auth -c ./drive.json
```

On success, `refresh_token` is written into the same file.

### 3. Create a Drive folder

Create a folder in Google Drive and copy its ID:

```text
https://drive.google.com/drive/folders/FOLDER_ID
```

### 4. Push backups

```bash
# One-time snapshot (+ WAL if present)
kit backup push -f FOLDER_ID

# Continuous sync
kit backup push -f FOLDER_ID --watch
```

### 5. Pull backups

```bash
kit backup pull -f FOLDER_ID -o ./database.sqlite
```

## Environment Variables

The commands read these env vars (loaded via `dotenv` in `kit`):

```env
DRIVE_CREDENTIALS=./drive.json
DRIVE_FOLDER=your_folder_id
DATABASE_PATH=./database.sqlite
```

## CLI Reference

```text
kit backup auth [options]
  -c, --credentials  Path to credentials JSON  (default: ./drive.json)
  -p, --port         Local callback port        (default: 3000)

kit backup push [options]
  -b, --database     Path to SQLite database     (default: ./database.sqlite)
  -c, --credentials  Path to credentials JSON    (default: ./drive.json)
  -f, --folder       Google Drive folder ID      (required if DRIVE_FOLDER not set)
  -s, --snapshot     Snapshot file name          (default: snapshot.db)
  -n, --name         WAL file name               (default: changes.wal)
  -w, --watch        Watch for changes continuously
  -r, --rotate       Rotation interval in hours  (default: 6)
  -d, --debounce     Debounce delay in ms        (default: 1000)

kit backup pull [options]
  -c, --credentials  Path to credentials JSON    (default: ./drive.json)
  -f, --folder       Google Drive folder ID      (required if DRIVE_FOLDER not set)
  -s, --snapshot     Snapshot file name          (default: snapshot.db)
  -n, --name         WAL file name               (default: changes.wal)
  -o, --output       Output database path         (default: ./database.sqlite)
```

## Library Usage

```ts
import { Database } from 'ajo-kit/database'
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

await syncer.once()

const { stop } = syncer.start()
// ...
await stop()
```

Public types:

```ts
import type {
  Drive,
  DriveOptions,
  Pusher,
  PushOptions,
  Watcher,
} from 'ajo-backup'
```

## How It Works

1. WAL auto-checkpoint is disabled for incremental shipping.
2. WAL changes are watched, debounced, copied to a temp file, then uploaded.
3. Rotation runs on an interval (default 6h): checkpoint/truncate WAL, upload fresh snapshot, clear remote WAL object.
4. Pull restores snapshot and optional WAL (`<output>-wal`) for SQLite recovery.

## Notes

- WAL mode is required (`journal_mode = WAL`).
- In `--watch` mode, SIGINT/SIGTERM triggers graceful shutdown (`stop()` + DB close).
