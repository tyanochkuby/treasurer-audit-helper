# Historia zmian umów

A small, read-only audit browser for treasurers. The application lets a user select an active contract, inspect all audit events that can be attributed to it, filter the result, and export the same view to CSV.

The UI is Polish. Code, API DTOs, environment variables, and this technical documentation are English.

## Local setup

Prerequisites:

- .NET 9 SDK
- Azure Functions Core Tools v4
- Node.js 22 or newer
- pnpm 10.24
- access to the SQL Server referenced by `REKRUTACJA_DB`

Copy `api/local.settings.json.example` to `api/local.settings.json` and replace every placeholder locally. `local.settings.json` is ignored by Git.

Required server settings:

| Setting | Purpose |
| --- | --- |
| `REKRUTACJA_DB` | SQL Server connection. Both a normal ADO.NET connection string and the supplied `sqlserver` URL form are accepted. |
| `ACCESS_CODE` | Long, random code shared with authorized treasurers. |
| `SESSION_SIGNING_KEY` | Separate random signing key, at least 32 characters. Never reuse the access code. |
| `COOKIE_SECURE` | Defaults to `true`. Set to `false` only for local HTTP development. |

From the repository root, run the API:

```bash
cd api && dotnet run
```

The Functions host listens on port 7071.

Run the frontend in another terminal:

```bash
cd frontend && pnpm install --frozen-lockfile && pnpm dev
```

Vite serves the app at `http://127.0.0.1:5173` and proxies `/api` to port 7071.

## Validation

```bash
dotnet test api.tests/AuditApi.Tests.csproj

cd frontend
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
```

## Deployment

The app is deployed to Azure Static Web Apps by `.github/workflows/azure-static-web-apps.yml` on every push to `main`. The four server settings above live in the Static Web App's application settings, never in the repository.

## Audit interpretation decisions

These rules are deliberate because the database does not provide a complete public contract-audit specification.

### Operations and entity labels

Operations (`1` = Added, `2` = Deleted, `3` = Modified) and entity codes `0`–`7` follow the supplied public enums. All (195) observed `AuditLog.Type = 0` rows have no old values, new values, or affected columns; entity codes above `7` are kept when they can be scoped to the contract and are shown as `Typ ({number})`.

### Contract scope

The selector contains active `DocumentHeader` rows where `DocumentType = 1` and `DeletedDate IS NULL`. An audit event is included only if its `OrganizationId` matches the selected contract and its `EntityId` or `ParentId` can be connected to one of these records:

- the selected contract or an annex (`DocumentType = 2`),
- invoice,
- payment schedule,
- contract funding,
- obligation,
- contract change,
- disclosure,
- file,
- note.

Ambiguous shared entities (for example a contractor referenced by several contracts whose audit row is empty) are excluded — rationale in [Decisions and trade-offs](#decisions-and-trade-offs).

The shared access code intentionally exposes contracts from all organizations. Therefore, you can see and search contracts by `OrganizationId`.

### Filtering, ordering, and volume

- The `to` date is inclusive in the Polish calendar. Internally it becomes the exclusive start of the following day in `Europe/Warsaw`.
- Timestamps are treated as UTC. The UI formats them with `pl-PL` in `Europe/Warsaw`; CSV uses ISO UTC.
- No pagination or row limiter is implemented. The given database has about 7,700 audit rows, the largest active-contract history is far smaller (160 events). Full contract history is more convenient for checking older changes and remains inexpensive at this scale. Revisit pagination if needed in the future.

### Presentation and raw values

Changed field labels are in Polish, translations come from the shared catalog in `frontend/src/i18n/pl/auditFieldLabels.json` (91 of the 94 field names observed in the source data), used by both the frontend and the API so Polish-label search and CSV export stay consistent. Fields whose domain meaning is not established (`P4`, `ExcludingAuthority`, `FoundingContractId`) and any newly observed field keep their raw names.

Since payloads in DB are snapshots and affected-column hints, to avoid presenting unchanged snapshot fields as changes, field rows are selected by operation:

- `Added` shows fields whose new value is not null.
- `Deleted` shows fields whose old value is not null.
- `Modified` shows fields whose old and new serialized values differ exactly.

The event itself is never discarded just because no meaningful field differences remain. The UI and CSV retain the mention about the event.

### CSV contract

CSV exports exactly the selected contract respecting UI filters and sort order, with one row per changed field, or one metadata-only row when an event has no meaningful field differences. Files use:

- UTF-8 with BOM,
- semicolon delimiter, declared to Excel with a leading `sep=;` line so the file opens correctly regardless of the machine's regional list separator,
- RFC-style quoting for delimiters, quotes, and newlines,
- ISO UTC timestamps,
- Polish display labels plus a separate technical field-name column,
- actor email and UUID,
- a metadata section describing the contract and active filters.

Cells whose first non-whitespace character is `=`, `+`, `-`, or `@` are prefixed with an apostrophe to prevent spreadsheet formula injection.

### Session, logout, and stale views

The access endpoint compares codes in constant time and issues an HMAC-signed cookie with `HttpOnly`, `SameSite=Strict`, and (outside local HTTP) `Secure`. The server stores no session state; a logout endpoint expires the cookie, which matters on a shared treasurer workstation. A 401 returns the user to the access screen while preserving the URL. New audit data is signalled with an indicator and never auto-refreshed.

## Decisions and trade-offs

Three decisions the task did not require, each justified by value for the treasurer:

**1. Ambiguous events are excluded, never guessed.**

An audit event enters a contract's history only when the data proves the relationship (`EntityId`/`ParentId` plus `OrganizationId` — see [Contract scope](#contract-scope)). A contractor referenced by five contracts whose audit row names no contract is shown under none of them. Likewise unknown entity codes appear as `Typ (N)` and fields such as `P4` keep their raw names instead of an invented translation.
*Value:* a shorter but defensible list is worth more than an apparently complete one, and it leaves the limited vertical space for events that actually mean something (which I took particular care of).

**2. Changes are designed to be read, not decoded.**

Source payloads are state snapshots, not minimal diffs: 13,386 of 40,439 field rows under "Added" were null→null entries, and some "Modified" rows carry identical values on both sides. The noise is filtered per operation (rules in [Presentation and raw values](#presentation-and-raw-values)), but the event itself never disappears. How a modification reads got the same attention: plain values render as a git-style diff (old value struck through next to the new one), while JSON payloads are compared structurally and show only the changed leaves with their paths, instead of two walls of serialized text. Long values expand in place, so the history never requires horizontal scrolling.
*Value:* a treasurer checking what changed in a contract does not wade through roughly 30% noise, yet never loses the proof that an operation was logged — and spots the actual change at a glance instead of comparing two blobs of text by eye.

**3. CSV export built for hand-off.**

The export opens correctly in Excel without the import wizard regardless of the machine's regional settings, carries a header with the contract name, organization, and active filters, Polish labels next to technical field names, and formula-injection protection (`=1+1` → `'=1+1`); format details in [CSV contract](#csv-contract).
*Value:* it lets the treasurer share the history with an auditor or accountant. The recipient sees exactly which slice of the history the report covers.

### Consciously left out

- **Pagination and virtualization** — see [Filtering, ordering, and volume](#filtering-ordering-and-volume): at the current data scale full history is more convenient for finding older changes. Pagination returns when measurements show a problem, not sooner.
- **User identity and in-app rate limiting** — one shared code is deliberately authorization, not identification. Individual accountability and brute-force protection belong at the gateway/edge (where they work across instances), not in MVP code. If individual accountability is required, put the app behind an identity-aware gateway.
