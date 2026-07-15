# Historia zmian umów

A small, read-only audit browser for treasurers. The application lets a user select an active contract, inspect all audit events that can be attributed to it, filter the result, and export the same view to CSV.

The UI is Polish. Code, API DTOs, environment variables, and this technical documentation are English.

## What is included

- React 19 + TypeScript + Tailwind CSS 4 frontend using the shadcn Nova preset, Base UI primitives, Inter Variable, and Hugeicons, while retaining the iFirma-inspired navy/blue/amber visual language.
- .NET 9 isolated Azure Functions API using Dapper and `Microsoft.Data.SqlClient`.
- One shared access code exchanged for a signed, 30-minute, `HttpOnly` session cookie.
- Contract search by displayed number/subject, contract UUID, and `OrganizationId`.
- Contract-scoped audit history, deterministic sorting, explicit filters, CSV export, and a lightweight new-data check.
- Unit, component, API-client, security, CSV, and optional read-only database smoke tests.

## Architecture

```text
Browser (Polish UI)
       |
       | /api, signed HttpOnly cookie
       v
Azure Static Web Apps + .NET isolated Functions
       |
       | parameterized, read-only SQL through Dapper
       v
SQL Server: DocumentHeader + related entities + AuditLog
```

No database credentials or access codes are sent to the browser. The API is the only component that connects to SQL Server.

## Local development

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

Run the API:

```bash
cd api
func start --dotnet-isolated --port 7071
```

Run the frontend in another terminal:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Vite serves the app at `http://127.0.0.1:5173` and proxies `/api` to port 7071.

### Frontend localization

User-facing text is managed with `i18next` and `react-i18next`. Polish is the default and fallback language; its type-safe resource is in `frontend/src/i18n/pl.ts`. Components should use `useTranslation()` instead of embedding display text, while non-React modules can import the configured instance from `frontend/src/i18n`. Date formatting follows the active i18next language and retains the `Europe/Warsaw` audit timezone.

## Validation

```bash
dotnet test api.tests/AuditApi.Tests.csproj

cd frontend
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
```

`DatabaseSmokeTests` performs read-only queries only when `REKRUTACJA_DB` is present. Without that setting it exits successfully, so CI does not require database access.

## Azure deployment

The repository is arranged for Azure Static Web Apps:

- app location: `frontend`
- API location: `api`
- frontend output: `dist`
- API runtime: `dotnet-isolated:9.0`

Create a Static Web App, configure all four server settings above in its application settings, and store its deployment token in the GitHub repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`. The workflow in `.github/workflows/azure-static-web-apps.yml` deploys pushes to `main` and can also be started manually.

Keep `COOKIE_SECURE=true` in Azure. Use a read-only SQL login and allow network access only from the required Azure service path. The database setting belongs in Azure application settings, never in a workflow or repository file.

## Audit interpretation decisions

These rules are deliberate because the database does not provide a complete public contract-audit specification.

### Operations and entity labels

Audit operation values are interpreted as:

| Value | Meaning |
| ---: | --- |
| 1 | Added |
| 2 | Deleted |
| 3 | Modified |

`AuditLog.Type = 0` is currently ignored. It occurs in the source data, but it is not present in the supplied public enum and its meaning is awaiting clarification.

Entity values `0` through `7` use the supplied public enum (`Unknown`, contract header, annex header, annex change, file, invoice, payment schedule, and contract funding). Any other entity code is retained when it can be reliably scoped to the contract and displayed as `Unknown ({number})`; it is never assigned a guessed business label.

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

Ambiguous shared entities are excluded. For example, a contractor may be referenced by five contracts while its audit row has no contract `ParentId`. Showing that event under every contract would claim a relationship the audit data does not prove, so it is omitted. This favors defensible evidence over an apparently more complete but potentially misleading history.

The shared access code intentionally exposes contracts from all organizations. `OrganizationId` is therefore visible and searchable in the global contract selector, and it is also enforced when scoping audit rows.

The verified source schema uses SQL `int` for `AuditLog.Id`. `PaymentSchedule`, `ContractFunding`, and `Note` do not expose an `OrganizationId` column, so they are scoped through their proven document/parent relationship; the final audit-row join still requires the selected contract's `OrganizationId`.

### Filtering, ordering, and volume

- Default order is `CreatedDate DESC, Id DESC`; oldest-first uses both keys ascending.
- The `to` date is inclusive in the Polish calendar. Internally it becomes the exclusive start of the following day in `Europe/Warsaw`.
- Timestamps are treated as UTC. The UI formats them with `pl-PL` in `Europe/Warsaw`; CSV uses ISO UTC.
- Search is case-insensitive and covers actor email/UUID, entity UUID, field name and Polish label, old/new value, and event description. Input is limited to 100 characters.
- Filter edits do not query immediately. `Zastosuj filtry` updates the URL and loads the result; `Wyczyść` removes them.
- No pagination or arbitrary row limiter is implemented. The inspected database has about 7,000 audit rows globally, while the largest reliably scoped contract history is far smaller (about 150 events). Full contract history is more convenient for checking older changes and remains inexpensive at this scale. Revisit pagination if an individual contract grows to thousands of events or measured response/DOM performance becomes unacceptable.

### Presentation and raw values

One audit event is grouped with its nested field changes. The UI shows common field names in Polish and retains the technical name as supporting information; unknown fields keep their raw names. Values are not semantically rewritten. JSON is pretty-printed when valid, and long values can be expanded.

### CSV contract

CSV exports exactly the active contract, filters, and sort order, with one row per changed field. Files use:

- UTF-8 with BOM,
- semicolon delimiter,
- RFC-style quoting for delimiters, quotes, and newlines,
- ISO UTC timestamps,
- Polish display labels plus a separate technical field-name column,
- actor email and UUID,
- a metadata section describing the contract and active filters.

Cells whose first non-whitespace character is `=`, `+`, `-`, or `@` are prefixed with an apostrophe to prevent spreadsheet formula injection. This means a raw value such as `=1+1` is exported as `'=1+1`; the apostrophe is a safety marker, not source data.

### Session, logout, and stale views

The access endpoint compares codes in constant time and issues an HMAC-signed cookie with `HttpOnly`, `SameSite=Strict`, and (outside local HTTP) `Secure`. The server stores no session state. A logout endpoint expires the cookie; this is important on a shared treasurer workstation. A 401 returns the user to the access screen while preserving the URL, so successful re-entry returns to the selected contract and filters.

While the selected contract is open and the tab is visible, the UI checks `/audit/version` every 60 seconds. It requests only the highest scoped audit ID. A mismatch shows a “new data” indicator; the table is refreshed only when the user asks, so rows do not move during an inspection.

## Known production gaps

- The shared code is intentionally simple authorization, not user identity or per-organization access control. Put the app behind an identity-aware gateway if individual accountability is required.
- No custom in-process rate limiter is included. The code is expected to be high entropy, comparisons are constant time, and production brute-force protection should be configured at the Azure edge/gateway where it remains effective across instances.
- Entity codes above 7 and operation type 0 require confirmation from the source-system owner.
- Ambiguous shared-entity audit events are intentionally absent until the database provides a reliable contract relationship.
- At much larger per-contract histories, server pagination or row virtualization should be introduced based on measurements.

## Security note

This application displays sensitive audit information. Do not deploy it with sample credentials, do not commit connection strings, use a read-only database principal, keep HTTPS and secure cookies enabled, rotate any credential that is actually exposed, and sign out after use on a shared device.
