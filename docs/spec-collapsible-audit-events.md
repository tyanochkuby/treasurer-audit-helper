# Spec: Collapsible audit event cards (Historia audytowa)

**Status:** Draft for development
**Scope:** Audit history view (document detail panel). No changes to the document sidebar, search, or CSV export logic.

## 1. Summary

Audit event cards in the document history become collapsible, GitHub-PR-file style. A collapsed card shows a single summary header row; expanding reveals the existing field-level diff table. Default state depends on history length (see §4). Adds a global Expand all / Collapse all control.

**Goal:** a document with 10+ events fits on one screen as a scannable index; the user expands only the events they care about.

## 2. Definitions

- **Event card** — one audit entry (e.g. "13 lip 2026 14:25:13 · Zmieniono · Typ 15 · 3 pola").
- **Header row** — the top bar of an event card (date, time, badge, event type, field count, actor email, event id, copy icon).
- **Body** — the field-level change table (field label, technical name, old → new values, JSON diff section).
- **Metadata section** — the top block with immutable document fields (DocumentId, OrganizationId, CreatedDate, …). **Not collapsible; always expanded; unaffected by Expand/Collapse all.**

## 3. Collapsed header content

The collapsed header must be sufficient to decide whether to expand. Extend the current header with a changed-fields summary:

```
[chevron] 13 lip 2026 14:25:13  [Zmieniono]  Typ 15 · 3 pola   Data publikacji, Wysłane dane +1   nowystring@yopmail.com  #7814  [copy]
```

- **Changed-fields summary:** human-readable labels of changed fields, comma-separated, truncated with `+N` when they don't fit the available width (single line, ellipsis-free — always truncate at a whole field name, never mid-label). For "Dodano" events, same rule using the added fields.
- Summary text style: secondary/muted, so it doesn't compete with the event type.
- On narrow widths, drop the summary first, then the actor email (in that order) before wrapping.

## 4. Default expansion state

On opening a document (or switching documents):

| Condition | Default |
|---|---|
| ≤ 4 events total | All expanded |
| ≥ 5 events | Most recent event expanded, all others collapsed |

- "Most recent" = first card in the (newest-first) list.
- Metadata section always expanded (§2).

## 5. Interactions

1. **Toggle:** clicking anywhere on the header row toggles the card. Exceptions: the copy button and any future links inside the header do not toggle (stopPropagation).
2. **Chevron:** left of the date; points right when collapsed, down when expanded; rotates with a ~150 ms transition.
3. **Expand/collapse animation:** height auto-animate, 150–200 ms ease-out. No slide/opacity theatrics. Respect `prefers-reduced-motion`: disable the animation, toggle instantly.
4. **Expand all / Collapse all:** single toggle button in the view header (next to Odśwież), label reflects the action it will perform:
   - If ≥ 1 card is collapsed → label „Rozwiń wszystkie", action expands all.
   - If all cards are expanded → label „Zwiń wszystkie", action collapses all.
5. **Keyboard:** header row is focusable (`tabindex=0`), Enter/Space toggles. Chevron/header exposed as `<button aria-expanded>` controlling the body region (`aria-controls`).
6. **Deep-link/scroll (if event anchors exist or are added later):** navigating to an anchored event auto-expands it and scrolls it into view.

## 6. State persistence

- **Odśwież (refresh):** preserve per-event expansion state, keyed by event id (e.g. `#7814`). New events arriving from refresh follow §4 logic for *new items only*: a newly arrived newest event appears expanded; other new events collapsed. Existing events keep their user-set state.
- **Document switch:** state resets to §4 defaults per document. (No cross-session persistence in this iteration.)
- **Search/filter within history (if/when added):** matching events auto-expand; restore prior state when the filter is cleared.

## 7. Ctrl+F / findability

Because collapsed content is invisible to browser find:

- The Expand all control is the documented answer for full-text search across a history.
- Do **not** render collapsed bodies as `display:none`-but-searchable hacks (`hidden="until-found"` may be used where supported as a progressive enhancement, but Expand all must exist regardless).

## 8. CSV export

Unchanged: export always includes all events regardless of expansion state.

## 9. Visual spec

- Collapsed card: header row only, same card background/border/radius as today; vertical padding reduced (suggest 12 px vs current).
- Gap between collapsed cards: keep current card gap so the list reads as discrete events.
- Hover on header row: subtle background tint (same token as list-item hover in the sidebar) to signal clickability.
- Chevron: 16 px, muted color, aligned with the date baseline.

## 10. Edge cases

1. **Event with 0 displayable fields** (shouldn't occur, but defensively): render header only, chevron hidden, not clickable.
2. **Very long field summaries** (e.g. 8 JSON leaf paths): summary shows first fields that fit + `+N`; never wraps to a second line.
3. **Single-event history:** expanded, chevron still shown and functional, Expand/Collapse-all button hidden (nothing to manage).
4. **Refresh returns fewer events** (shouldn't happen for an audit log; treat as full reset to §4 defaults and log a warning).

## 11. Acceptance criteria

- [ ] Document with ≥ 5 events opens with only the newest event expanded; all collapsed headers show date, badge, type, field count, field summary, actor, id.
- [ ] Document with ≤ 4 events opens fully expanded.
- [ ] Clicking a header (outside copy button) toggles; Enter/Space toggles when focused; `aria-expanded` updates.
- [ ] „Rozwiń wszystkie"/„Zwiń wszystkie" button behaves per §5.4 and its label updates reactively.
- [ ] Odśwież preserves the user's expansion state for pre-existing events (verified by id).
- [ ] Metadata section is never collapsible and never affected by the global toggle.
- [ ] Animations disabled under `prefers-reduced-motion`.
- [ ] CSV export output identical before/after this feature.

## 12. Out of scope (explicitly)

- Sidebar restructuring / slide navigation between document list and event list.
- "Reviewed" tracking per event.
- Cross-session persistence of expansion state.
- History filtering by field/actor/date (separate spec).
