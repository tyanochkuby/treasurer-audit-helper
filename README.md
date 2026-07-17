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

Operations (`1` = Added, `2` = Deleted, `3` = Modified) and entity codes `0`–`7` follow the supplied public enums. `AuditLog.Type = 0` occurs in the source data but is not part of the public enum, so those rows are excluded. Entity codes above `7` are kept when they can be scoped to the contract and shown as `Typ ({number})`.

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

Ambiguous shared entities (for example a contractor referenced by several contracts whose audit row is empty) are excluded — rationale in [Decyzje ponad wymagania](#decyzje-ponad-wymagania).

The shared access code intentionally exposes contracts from all organizations. Therefore, ou can see and search contract by `OrganizationId`.

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

The event itself is never discarded just because no meaningful field differences remain. The UI and CSV retain the mention about the event. The rule is grounded in a scan of the source data, where roughly a third of `Added` field rows were null-to-null snapshot entries.

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

## Known production gaps

The scope limits — shared-code authorization instead of user identity, no in-app rate limiting, no pagination, and unconfirmed audit codes — are deliberate. Their rationale is described in [Decyzje ponad wymagania](#decyzje-ponad-wymagania) below. If individual accountability is required, put the app behind an identity-aware gateway.

---

## Recruitment answers in Polish

Trzy decyzje, których zadanie nie wymuszało, każda uzasadniona wartością dla skarbnika:

1. **Niejednoznaczne zdarzenia są wykluczane, a nie zgadywane.**

Zdarzenie audytowe trafia do historii umowy tylko wtedy, gdy da się je udowodnić relacją w danych (`EntityId`/`ParentId` plus `OrganizationId`). Kontrahent powiązany z pięcioma umowami, którego wiersz audytu nie wskazuje umowy, nie jest pokazywany pod żadną z nich. Analogicznie nieznane kody encji wyświetlają się jako `Typ (N)`, a pola takie jak `P4` zachowują surową nazwę zamiast wymyślonego tłumaczenia.
*Wartość:* krótsza, ale obronialna lista jest warta więcej niż pozornie kompletna. pozwala zmieścić więcej sensownych zdarzeń w ograniczonej przestrzeni pionowej (o to szczególnie zadbałem).

**2. Odsiewanie pozornych zmian — snapshoty null→null nie udają zmian.**

Źródłowe payloady to zrzuty stanu, nie minimalne diffy. 13 386 z 40 439 wierszy pól przy operacji „Dodano” to wpisy null→null, a część „Zmodyfikowano” ma identyczne wartości po obu stronach. Ten szum jest filtrowany per operacja, ale samo zdarzenie nigdy nie znika.
*Wartość:* skarbnik weryfikujący, co się zmieniło w umowie, nie przedziera się przez ok. 30% szumu, a jednocześnie nie traci dowodu, że operacja została zarejestrowana.

**3. CSV eksport.**

Eksport otwiera się poprawnie w Excelu bez kreatora importu niezależnie od ustawień regionalnych komputera, zawiera nagłówek z nazwą umowy, organizacją i aktywnymi filtrami, polskie etykiety obok technicznych nazw pól oraz ochronę przed formula injection (`=1+1` → `'=1+1`).
*Wartość:* pozwala podzielić się hitorią z audytorem lub księgową. Odbiorca pliku widzi, z jakiego wycinka historii pochodzi raport.

### Co świadomie odpuszczono

- **Paginacja i wirtualizacja** — pisałem wyżej. Cała baza ma ok. 7,7 tys. wierszy audytu, największa realna historia umowy to 160 zdarzeń. Pełna historia jest wygodniejsza przy szukaniu starszych zmian; paginacja wróci, gdy pomiary pokażą problem, nie wcześniej.
- **Tożsamość użytkownika i rate limiting w aplikacji** — jeden współdzielony kod to świadomie autoryzacja, nie identyfikacja. Rozliczalność osobowa i ochrona przed brute-force należą do bramy/edge (gdzie działają między instancjami), a nie do kodu MVP.
