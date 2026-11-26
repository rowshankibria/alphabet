# The `-wal` and `-shm` files next to `qrbridge.db`, explained

Next to every `qrbridge.db` there are two more files, `qrbridge.db-wal` and `qrbridge.db-shm`. This page explains
what they are, which part comes from SQLite and which part from our code, why the design wants them, and what
operators must and must not do with them. Checked against the code and the libraries on 26 Nov 2026
(EF Core 10.0.15, Microsoft.Data.Sqlite 10.0.10).

## The short answer

**Both.** SQLite creates and manages the two files itself, **because our code tells it to use WAL mode**
("write-ahead log").

SQLite's default is different: a *rollback journal* (`journal_mode = DELETE`), a temporary `qrbridge.db-journal`
that exists only while a write is in progress and is then deleted. In that mode you would never see `-wal` or
`-shm`. Neither EF Core nor Microsoft.Data.Sqlite switches to WAL on its own (their assemblies contain no
`journal_mode` setting): it is our choice, made in our code.

## The three files

| File | What it holds | Everyday comparison |
|---|---|---|
| `qrbridge.db` | The database: Outbox, Inbox and the bookkeeping tables. | The ledger. |
| `qrbridge.db-wal` | The **write-ahead log**. Every committed change is appended here first; SQLite copies it into the `.db` later (a *checkpoint*). Until then, **the newest rows exist only in this file**. | Today's entries on loose pages, copied into the ledger at the end of the day. |
| `qrbridge.db-shm` | The **WAL index**, a small memory-mapped file. Every process that has the database open uses it to know which version of each page is the newest. Temporary; SQLite rebuilds it. | The bookmark that says which loose page is the latest. |

## What our code configures

| Setting | Where | When | What it does |
|---|---|---|---|
| `PRAGMA journal_mode = WAL;` | [`DatabaseInitializer.cs:47`](../../src/QrBridge.Shared/Data/Initializers/DatabaseInitializer.cs#L47), called by [`StartupChecks.cs:79`](../../src/QrBridge.Gateway/Initializer/StartupChecks.cs#L79) | Once, at gateway start-up, after the tables are created or upgraded | Turns WAL on. The mode is **stored in the database file itself**, so every later connection uses it automatically: the gateway, the web UI, the QR apps, even DB Browser for SQLite. |
| `PRAGMA busy_timeout = 5000;` | [`SqlitePragmaInterceptor.cs:15`](../../src/QrBridge.Shared/Data/SqliteExtensions/SqlitePragmaInterceptor.cs#L15) | On **every** connection open (an EF Core connection interceptor) | SQLite allows one writer at a time. A second writer **waits up to 5 s** for the lock instead of failing at once with `SQLITE_BUSY`. |
| `PRAGMA synchronous = FULL;` | Same line | Every connection | Every commit is synced to disk (fsync of the WAL). A message the caller was told was "accepted" survives a power cut; with `NORMAL`, WAL mode could lose the last commits (review finding G-14). |
| Connection string: `Mode = ReadWriteCreate`, `Cache = Private`, `Pooling = true`, `DefaultTimeout = 30` | [`DatabaseSetup.cs:8-15`](../../src/QrBridge.Shared/Data/Initializers/DatabaseSetup.cs#L8-L15) | Every connection | Opens (or creates) the file and keeps connections in a pool; Microsoft.Data.Sqlite also retries a busy database for up to 30 s. |
| The same string with `Mode = ReadOnly` | [`ReadOnlyBridgeDb.cs:27-28`](../../src/QrBridge.Gateway/Ui/Data/ReadOnlyBridgeDb.cs#L27-L28) | The web UI's connections | The UI reads through WAL like everyone else, and SQLite itself refuses any write made through it. |
| A test pins both settings | [`RepositoryTests.cs:80-90`](../../tests/QrBridge.Tests/RepositoryTests.cs#L80-L90) | `dotnet test` | Fails if `journal_mode` is not `wal` or `synchronous` is not `FULL`. |

The QrDiode Receiver's own, separate journal database uses the same two settings
([`SqliteJournal.cs:39-40`](../../../qrdiode/src/QrDiode.Receiver/Storage/SqliteJournal.cs#L39-L40)).

## What SQLite then does on its own

1. **First write after the file is opened:** SQLite creates `qrbridge.db-wal` and appends each committed
   transaction to it, instead of rewriting pages inside the `.db`.
2. **`qrbridge.db-shm`** is created alongside, so that all processes with the database open (the gateway, the UI,
   later the QR Sender and Receiver) can share it safely at the same time.
3. **Checkpoint:** when the WAL reaches **1,000 pages** (SQLite's default `wal_autocheckpoint`; we do not change
   it), the connection that commits next copies the changes into the `.db`. Afterwards SQLite **reuses** the WAL
   from its start, so the file does not keep growing.
   *Measured on the development machine:* the Corp `qrbridge.db-wal` was 4,132,392 bytes, which is a 32-byte
   header plus exactly **1,003** frames of 4,120 bytes (one 4 KB page plus a 24-byte frame header). The DMZ file
   was exactly **1,000** frames. That is why both are about 4 MB.
4. **When the last connection closes cleanly:** SQLite runs a final checkpoint and **deletes** `-wal` and `-shm`.
   Our connections are pooled, so the two files stay for as long as the gateway process runs, even when idle.
5. **After a crash or a power cut:** on the next open SQLite replays the committed transactions from the WAL and
   ignores any half-written one. Nothing is lost that a caller was told was accepted, and nothing needs repair.

## Why the design uses WAL

- **Several programs share one file.** The gateway (IIS) and its web UI already do; the QR Sender and Receiver
  will (integration plan §2.4–2.5). In rollback-journal mode a writer blocks readers while it commits, and long
  readers block commits. In WAL mode **readers and the writer do not block each other**: each reader sees a
  consistent snapshot. Writers still take turns, which is what `busy_timeout` handles.
- **The caller waits for the commit.** The gateway answers a caller only after the Outbox commit. A WAL commit is
  one sequential append and one sync, cheaper than the rollback journal's extra writes and syncs.
- **Durability.** WAL with `synchronous = FULL` means a commit that returned is on disk. The message rate is low,
  so the cost of the extra sync does not matter.

## What if we did not use WAL (no `-wal` / `-shm` files)?

**In short:** the data would stay safe, but the programs that share `qrbridge.db` would start **blocking each
other**: callers would wait longer and, at busy moments, some calls would be **refused**. And "no helper file at
all" is not a safe option.

**SQLite always needs a helper file to write safely.** Without WAL the realistic choice is SQLite's default mode:

| Journal mode | Helper file | Safe after a crash or power cut? |
|---|---|---|
| **WAL** (ours) | `-wal` + `-shm`, kept while the file is open | Yes |
| **DELETE** (SQLite's default) | `qrbridge.db-journal`, created at every write and deleted after the commit | Yes |
| MEMORY | none on disk (journal in RAM) | **No**: a crash during a commit can corrupt the database |
| OFF | none | **No**: commits are not atomic; a crash can corrupt the database |

MEMORY and OFF are out of the question: the gateway tells a caller "accepted" only after the commit. So the
alternative is DELETE, and in our system it would mean:

| Impact | Why |
|---|---|
| **Readers and the writer block each other** | To commit, the writer needs an exclusive lock and waits until every reader has finished; while it waits and commits, new readers wait too. WAL has neither wait. |
| **Callers wait longer for "accepted"** | The gateway answers only after the Outbox commit, and that commit now waits for the readers that never stop: the InboxWorker (every second), the receipt and maintenance workers, `/health`, the web UI, and later the QR Sender and Receiver (separate programs). |
| **Some calls refused at busy moments** | If the lock does not come free in time (`busy_timeout` 5 s; Microsoft.Data.Sqlite retries up to 30 s), SQLite reports "database is locked" and the caller gets a SOAP fault: *"The bridge could not store the message; it was NOT accepted. Please retry."* ([`SenderEndpoint.cs:162-167`](../../src/QrBridge.Gateway/Ingress/SenderEndpoint.cs#L162-L167)). In islanding, Rapid Restore would see failed permits or cards; Receipts, Replies and status updates would also be delayed. |
| **The web UI would slow the gateway down** | A slow list or count query would hold back the gateway's commits, and pages would pause while the gateway writes. |
| **Every commit costs more** | With `synchronous = FULL`: copy the old pages to the journal, sync it, write the database, sync it, delete the journal (two or more syncs, scattered writes) instead of one append and one sync. |
| **The UI can fail after a crash** | A crash during a write leaves a "hot journal" that a read-only connection (the UI's) cannot roll back: the UI shows errors until a read-write program (the gateway restarting) opens the file. |

**What would not change:** data safety. DELETE mode with `synchronous = FULL` is crash-safe too: commits stay
all-or-nothing and nothing that was accepted is lost. The difference is **concurrency and speed, not integrity**,
and it shows at bursts (the start of an islanding event) and once the QR apps share the file, less at quiet times.

**What DELETE mode would give in return, and why we do not need it:** one single file when idle (for a backup or a
copy, use `VACUUM INTO` or a checkpoint instead, below), and use from a network share or read-only media (by design
the database is local, one per machine).

**Decision: keep WAL.** Changing it is a design change: `DatabaseInitializer` would change, the guard test in
`RepositoryTests` would fail on purpose, and because the mode is stored in the file, switching back needs
`PRAGMA journal_mode = DELETE;` run while no other program has the file open.

## Rules for operators

| Do | Don't |
|---|---|
| Keep the three files together when copying or moving a database. | Copy only `qrbridge.db` while a gateway or QR app is running: the newest rows are still in `-wal`. |
| To get one self-contained file: stop every program that uses it (SQLite then merges and removes `-wal` and `-shm`), or run `PRAGMA wal_checkpoint(TRUNCATE);`. | Delete `-wal` or `-shm` by hand: that can lose committed messages or leave the database inconsistent. |
| Open the database in DB Browser for SQLite while the gateway runs, if needed: it reads all three files. | Put the data folder on a network share (next section). |

All three files are kept out of source control (`*.db`, `*.db-wal`, `*.db-shm` in `.gitignore`).

## Questions the technical team may ask

**Can the data folder be on a network share?**
No. WAL relies on shared memory (`-shm`), so every program that opens the file must run **on the same machine,
on a local disk**. This matches the design: one `qrbridge.db` per machine, by default in
`C:\ProgramData\QrBridge\Data` (`Bridge:DataFolder`).

**Which permissions are needed?**
The account that runs the gateway (the IIS application pool identity) and the account that runs the QR apps need
**modify rights on the data folder**, not only on the file: SQLite creates and deletes `-wal` and `-shm` next to it.

**How do we back it up?**
Stop the programs and copy the three files; or checkpoint first (`PRAGMA wal_checkpoint(TRUNCATE);`) and copy the
`.db`; or take an online copy with `VACUUM INTO 'C:\backup\qrbridge-copy.db';`, which writes one consistent file
while the gateway keeps running.

**Can the WAL grow without limit?**
Only if a reader keeps one snapshot open for a very long time, which holds checkpoints back. The gateway and the UI
run short queries, so in practice the WAL stays at about 4 MB.

**Does the read-only UI slow the gateway down?**
No. In WAL mode its reads do not block the gateway's writes, and its connections cannot write at all
(`Mode = ReadOnly`).

**What happens if two programs write at the same moment?**
One gets the write lock; the other waits (up to 5 s through `busy_timeout`, and Microsoft.Data.Sqlite retries up
to 30 s) and then commits. Neither fails, and neither overwrites the other.

## Check it yourself

- In DB Browser for SQLite (or any SQLite shell) on `qrbridge.db`: `PRAGMA journal_mode;` answers `wal`.
- The test that pins the settings:

  ```powershell
  dotnet test sourcecode\gateway\tests\QrBridge.Tests --filter "FullyQualifiedName~Every_connection_is_on_disk_before_a_commit_returns"
  ```

- Where the development databases are: `C:\QrBridgeDev\Corp\Data` and `C:\QrBridgeDev\Dmz\Data` (the launch
  profiles' folders; see [read-only-ui.md §2](../reference/read-only-ui.md#2-run-it)).
