# Display Theme Engine — Implementation Plan

_Author: planning draft · Date: 2026-06-19_

## 1. Goal

Today the iPad and Android apps render event data with a single hardcoded design (the dark-navy gradient agenda in `DisplayView.swift` / `DisplayScreen.kt`). This plan adds **multiple, swappable display themes** that are selected per room from the web app, with a system default that exactly reproduces today's look.

### Locked decisions (from requirements review)
- **Theme model:** data-driven. Themes are JSON definitions stored in the database and rendered dynamically by the clients (not separate hardcoded screens per theme).
- **Assignment granularity:** **per room.** A room may be assigned a theme; otherwise it falls back to the tenant default, then the system default. (Building-level assignment was considered and dropped in favor of room-level.)
- **Authoring:** developers create new themes (seed/JSON + code where a new layout is needed). The web app **assigns and previews** themes; it is not a no-code theme builder.
- **Clients in scope:** iPad (SwiftUI) **and** Android (Jetpack Compose). The web `display/[id]` page is out of scope for this phase (but reused as the preview renderer — see §7).

### Requirements mapping
| # | Requirement | Where addressed |
|---|---|---|
| 1 | Current hardcoded design = system default | §4 (seed `system_default`), §6 (parity refactor) |
| 2 | Tenant default theme, used unless a room overrides | §3 (`tenants.default_theme_id`), §5 (resolution) |
| 3 | Assign different themes per room | §3 (`rooms.theme_id`), §7 (assignment UI) |
| 4 | Support the example "What's Happening Today" theme | §9 (second theme: `vcu_light`) |
| 5 | Thumbnails of available themes | §7, §8 (thumbnail generation) |
| 6 | Theme assignment page (preview + select) | §7 |
| 7 | Means to create additional themes | §10 (developer authoring workflow) |
| 8 | Implementation plan | this document |

---

## 2. Current architecture (as found)

- **Web app:** Next.js (App Router) + MySQL via `mysql2` (`src/lib/db.ts`). Multi-tenant: `tenants → buildings → rooms → devices → events` (+ `facilitators`, `users`). Admin UI under `src/app/admin/*`; APIs under `src/app/api/*`.
- **Delivery to devices:** the tablet apps fetch `GET /api/rooms?id=…&tenant_id=…` (returns room + `tenant_name`, `tenant_address`, `tenant_logo_url`) and `GET /api/events?room_id=…`. SSE (`/api/events/stream`) pushes change notifications.
- **iPad (SwiftUI):** `Views/DisplayView.swift` holds the layout and **all** colors/fonts/spacing as literals; `EventCardView`, `CurrentEventView`, `HeaderView` likewise. `Models/AppConfig.swift` (roomId/tenantId/apiBaseURL/deviceId), `Models/Event.swift`, `Services/APIService.swift`.
- **Android (Compose):** parallel structure — `presentation/display/DisplayScreen.kt`, `display/components/{HeaderView,EventCard,CurrentEventCard,FooterView,FacilitatorIcon}.kt`, `presentation/theme/Theme.kt`, `data/models/{Room,Event,AppConfig}.kt`, `data/remote/ApiService.kt`.

**Key leverage point:** both apps already fetch `/api/rooms` on launch. If the server attaches a **resolved theme** to that payload, client plumbing is minimal — no new networking, no new config fields on the device.

---

## 3. Data model

New table plus two nullable foreign keys. (Note: `create_tables.sql` is stale vs. the live DB — ship these as additive migrations, not by editing that file.)

```sql
CREATE TABLE themes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NULL,            -- NULL = global theme, available to every tenant
  key_name      VARCHAR(64)  NOT NULL,           -- stable machine key, e.g. 'system_default', 'vcu_light'
  name          VARCHAR(255) NOT NULL,           -- display name shown in the UI
  description   TEXT NULL,
  definition    JSON NOT NULL,                   -- the theme spec (see §4)
  thumbnail_url VARCHAR(512) NULL,               -- pre-rendered preview image
  is_system     TINYINT(1) NOT NULL DEFAULT 0,   -- system default; cannot be deleted
  schema_version INT NOT NULL DEFAULT 1,
  status        ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_themes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_themes_scope_key (tenant_id, key_name),
  INDEX idx_themes_tenant (tenant_id)
) ENGINE = InnoDB;

-- Tenant-wide default
ALTER TABLE tenants ADD COLUMN default_theme_id BIGINT UNSIGNED NULL,
  ADD CONSTRAINT fk_tenants_theme FOREIGN KEY (default_theme_id) REFERENCES themes(id) ON DELETE SET NULL;

-- Per-room override
ALTER TABLE rooms ADD COLUMN theme_id BIGINT UNSIGNED NULL,
  ADD CONSTRAINT fk_rooms_theme FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE SET NULL;
```

Design notes:
- `tenant_id NULL` lets global/system themes be shared; tenant-scoped rows allow per-customer branded themes later without schema change.
- `ON DELETE SET NULL` on both assignments means deleting/archiving a theme safely falls back down the hierarchy rather than breaking displays.
- Assignment is per room. If a "set the whole building at once" shortcut is wanted later, it can be added as a bulk UI action that writes `rooms.theme_id` for every room in a building — no schema change needed.

---

## 4. Theme definition schema (v1)

A theme is a JSON document combining a **layout archetype** (which coded template the client renders) with **design tokens** (colors, type, text, toggles). This is the pragmatic reading of "data-driven": colors/fonts/text/visibility are fully data and require **no app release** to change; the structural layout is one of a small enumerated set of archetypes shared by both native clients.

> Why archetypes rather than a free-form layout language: a fully arbitrary layout interpreter on two native UI stacks (SwiftUI + Compose) is a large, fragile build, and the two target designs (current dark agenda and the VCU "What's Happening Today" board) are the **same agenda layout with different tokens**. Archetypes deliver the visible variety customers want while keeping rendering robust. Adding a genuinely new structure (e.g. a grid/poster layout) is a developer task that adds one archetype to both clients — see §10. _If truly arbitrary per-theme layouts are required, flag it now; it materially changes client effort._

Example definition (captures the look of the attached VCU example):

```jsonc
{
  "schemaVersion": 1,
  "layout": "agenda_list",          // enumerated: agenda_list | (future) grid | poster ...
  "colors": {
    "background": { "type": "image_blur", "fallback": "#C9D2DA" },
    "panel": "#EAF0F4",
    "headerAccentBar": "#E8B600",   // gold side bar
    "tickerBar": "#16213E",
    "tickerText": "#FFFFFF",
    "primaryText": "#2B2F36",
    "secondaryText": "#5A6470",
    "accent": "#E8B600",
    "currentEventHighlight": "#E8B600"
  },
  "typography": {
    "fontFamily": "system",         // 'system' or a bundled font key registered in both apps
    "headingSize": 48, "dateSize": 28, "eventTitleSize": 32, "eventTimeSize": 32,
    "scale": 1.0
  },
  "header": {
    "title": "WHAT'S HAPPENING TODAY?",
    "showDate": true, "showClock": true,
    "logoPosition": "left"
  },
  "components": {
    "eventRow": "time_left_title_right",
    "showFacilitator": false,
    "showPastEvents": false,
    "showTicker": true,
    "clockPosition": "bottom_left"
  }
}
```

- The **`system_default`** theme is the same schema with tokens set to today's literal values (dark gradient background, white text, etc.), `layout: "agenda_list"`. After the client refactor it must be **pixel-identical** to the current build.
- A versioned, documented JSON Schema lives at `docs/theme.schema.v1.json` and is used to validate definitions in the seed/management path and in CI.
- **Forward compatibility:** clients ignore unknown keys; if a required field is missing or `layout` is unknown, the client falls back to `system_default`.

---

## 5. Theme resolution

Resolved **server-side** so clients never implement precedence logic. Order:

1. `rooms.theme_id` (the room itself), if set and active →
2. `tenants.default_theme_id`, if set and active →
3. the `is_system = 1` theme (`system_default`) — always present.

Implement as a small helper `resolveThemeForRoom(roomId)` in `src/lib/` returning the full theme `definition` (+ `id`, `key_name`, `schema_version`). Used by the delivery endpoints in §6.

---

## 6. API changes

**Delivery (what devices consume):**
- Extend `GET /api/rooms` to include a `resolved_theme` object on each room row (full definition after §5 resolution). This is additive — existing fields unchanged, so current shipped apps that ignore it keep working.
- Optionally extend `GET /api/config` with the same, for future device-config use.
- **Live updates:** extend the SSE broadcast so a theme reassignment emits an event the clients already listen for (they re-fetch `/api/rooms` on change). If we skip this in phase 1, themes still apply on the next periodic refresh.

**Management & assignment (web app):**
- `GET /api/themes?tenant_id=…` — list active themes visible to the tenant (global + tenant-scoped) with `id, key_name, name, description, thumbnail_url`. Powers the assignment grid.
- `GET /api/themes/:id` — full definition (preview).
- `PUT /api/rooms` — accept optional `theme_id` (assign/clear room override). Auth: ORG_ADMIN / SYSTEM_ADMIN.
- Tenant default: extend the org/tenant settings endpoint (`/api/tenants` or organization page handler) to set `default_theme_id`.
- `POST` / `PUT` / `DELETE /api/themes` — developer/admin theme management, gated to **SYSTEM_ADMIN**; validates `definition` against the JSON Schema; blocks delete/archive when `is_system = 1`. (Day-to-day theme creation can also be done via seed migration; this endpoint is the supported runtime path.)

All write endpoints enforce tenant scoping and role checks consistent with existing routes.

---

## 7. Web app — Theme Assignment page (req 3, 5, 6)

New route `src/app/admin/themes/page.tsx` (+ nav link from `src/app/admin/page.tsx`), following the existing admin page patterns (SWR, session role gating).

Layout:
- **Available themes** — responsive grid of **thumbnail cards** (req 5) from `GET /api/themes`: thumbnail image, name, description, a "Preview" action.
- **Tenant default** — selector that writes `tenants.default_theme_id`; clearly labeled as the fallback for all rooms.
- **Per-room assignment** — rooms grouped by building (reusing the existing rooms query, which already returns `building_name`), each room row with its current theme (or "Using tenant default"), a dropdown to assign/clear (`PUT /api/rooms`), and a thumbnail of the effective theme. A per-building "apply to all rooms" bulk action is an optional convenience (writes `theme_id` to each room in the group).
- **Live preview** — a shared React component `src/components/ThemePreview.tsx` renders a theme `definition` with representative sample events at display aspect ratio (16:9 / 4:3). Used both inline (modal/side panel) and as the source of truth for thumbnail generation (§8), so previews and thumbnails never drift from what devices render.

Roles: SYSTEM_ADMIN and ORG_ADMIN can assign; SCHEDULER/VIEWER read-only (consistent with other admin pages).

---

## 8. Thumbnails (req 5)

Generated, not hand-drawn, so they stay truthful to the JSON:
- A Node script (`scripts/generate-theme-thumbnails.*`) uses headless Chromium (Playwright) to render `ThemePreview` for each theme at a fixed size, exports a PNG, stores it (e.g. `public/uploads/themes/<key>.png` or the existing upload store), and sets `themes.thumbnail_url`.
- Re-run when a theme's `definition` changes (manual step or CI hook).
- Fallback: if a thumbnail is missing, the assignment grid renders the live `ThemePreview` at small scale.

---

## 9. Example theme: "What's Happening Today" (req 4)

Ship as the second seeded theme `vcu_light` using `layout: "agenda_list"` with the light/gold tokens shown in §4 (light panel, gold accent bar, dark ticker, centered date header, clock bottom-left, past events hidden). This validates that two visually distinct themes come from one archetype + tokens — proving the data-driven approach before investing in additional archetypes.

---

## 10. Developer workflow to create additional themes (req 7)

1. **Author** a `definition` JSON (choose an existing `layout`, set tokens). Validate against `docs/theme.schema.v1.json`.
2. **If a new structure is needed** (not just colors/text): add a new layout archetype view in **both** clients — a SwiftUI view selected by `LayoutRouter` and a Compose composable selected by the Android router — and add the key to the shared layout enum. This is the only step requiring an app release.
3. **Register** the theme: seed migration row or `POST /api/themes` (SYSTEM_ADMIN). Set `tenant_id` (NULL for global, or a specific tenant for a branded one).
4. **Generate** its thumbnail (§8).
5. It now appears in the assignment grid and is selectable per building / as tenant default.

Documented in `docs/THEMES.md` (authoring guide + token reference + screenshots).

---

## 11. Client implementation

### iPad (SwiftUI)
- `Models/Theme.swift`: `Codable` structs mirroring the definition (`ThemeColors`, `ThemeTypography`, `ThemeHeader`, `ThemeComponents`) + hex→`Color` and gradient helpers. Lenient decoding (unknown keys ignored, defaults for missing).
- Extend `Room` decoding (in `APIService`) to read `resolved_theme`; expose it via a `ThemeProvider: ObservableObject` injected as `@EnvironmentObject`.
- **Refactor** `DisplayView`, `HeaderView`, `EventCardView`, `CurrentEventView` to read every color/size/text/toggle from the theme instead of literals. Introduce a `LayoutRouter` that switches on `theme.layout` to the archetype view.
- Bake current literals into the `system_default` JSON; verify pixel parity.
- Fallback: nil/unparseable theme or unknown layout → `system_default`.

### Android (Compose) — mirror
- `data/models/ThemeDefinition.kt` (+ nested) with the same fields; extend `Room.kt` with `resolvedTheme`.
- `LocalDisplayTheme` `CompositionLocal` provided at `DisplayScreen` root.
- Refactor `DisplayScreen.kt` and `display/components/*` to consume tokens; layout router composable on `theme.layout`.
- Same fallback behavior. Keep `presentation/theme/Theme.kt` (Material theme) for app chrome; the display theme is separate and data-driven.

Keep both clients' field names/enums in lockstep with the JSON Schema (single source of truth in `docs/`).

---

## 12. Migration, compatibility & rollout

Additive, reversible migrations (numbered `scripts/` SQL or your migration tool):
1. Create `themes`; add `tenants.default_theme_id`, `rooms.theme_id`.
2. Seed `system_default` (`is_system = 1`, tokens = current look).
3. Seed `vcu_light`.

Backward compatibility:
- `resolved_theme` is additive on `/api/rooms`; **older deployed apps ignore it** and keep working.
- New app builds with a missing/old theme fall back to `system_default` — no broken displays.
- No forced device update: theming activates as devices get the new build, all defaulting to the identical system look until a room is reassigned.

Suggested phase order (each shippable independently):
- **P0** Schema + seed `system_default` (no behavior change).
- **P1** Resolution helper + `resolved_theme` in `/api/rooms` (no visual change; devices still ignore it).
- **P2** Client theming refactor (iOS + Android) reading `system_default` → still pixel-identical. _Highest-risk phase; gate on visual parity tests._
- **P3** `vcu_light` theme + any new archetype + thumbnail script.
- **P4** Web Theme Assignment page (grid, thumbnails, preview, room + tenant assignment) + `/api/themes` + `PUT /api/rooms` theme_id.
- **P5** SSE live theme push (optional polish).
- **P6** QA hardening, authoring docs, fallback edge cases.

---

## 13. Verification

- **Unit:** theme JSON decode (Swift + Kotlin, including missing/unknown fields), hex/gradient parsing, `resolveThemeForRoom` precedence (room > tenant > system).
- **Visual parity:** snapshot the `system_default` render against the current build on both clients — must match before/after the refactor.
- **Cross-surface consistency:** web `ThemePreview` vs. device render for the same definition.
- **End-to-end:** assign a theme to a room in the web app → confirm the iPad and Android units in that room update (on refresh, and on SSE if P5 shipped) while other rooms stay on the tenant default.
- **Safety:** delete/archive an assigned theme → assignments null out and displays fall back without errors; attempt to delete `system_default` → blocked.

---

## 14. Resolved decisions

These were the open questions from the planning review; each is now decided. The decision is reflected in the v1 artifacts (`docs/theme.schema.v1.json`, the two seed definitions, the P0/P1 code).

- **Layout flexibility — DECIDED: archetype model, one archetype in v1.** Themes are a layout archetype + tokens, not a free-form layout language. v1 ships a single archetype, `agenda_list`, which covers both target designs (current dark agenda and the VCU light board) purely through tokens. A free-form layout interpreter on two native stacks is explicitly out of scope; a genuinely new structure (grid, poster) is added as a new archetype value rendered by a coded view in both clients (see §10 and `docs/THEMES.md`). The `layout` enum in the schema currently lists only `agenda_list`; adding a value is a deliberate, release-gated change. _Revisit only if a customer needs a layout that tokens on `agenda_list` cannot express._
- **Fonts — DECIDED: `system` only in v1.** `typography.fontFamily` accepts `"system"` (San Francisco / Roboto) or a font key, but v1 clients support `"system"` only and fall back to it for any unknown key. Bundling a custom font is a later, release-gated task (register the same key in both apps, then it becomes selectable with no schema change). This keeps v1 free of an asset-bundling dependency.
- **Backgrounds — DECIDED: tenant-uploaded assets via the existing upload store, referenced by URL; not bundled per theme.** The schema's `image_blur` fill carries a `url` (a tenant asset, reusing `/api/upload`/the existing logo store) plus a `blurRadius` and a solid `fallback`. Bundling images inside the apps was rejected because it would force an app release per background. For v1, `vcu_light` ships with `url: null` so it renders on its solid `fallback` (`#C9D2DA`) with no asset pipeline; a tenant can later point `url` at an uploaded image without a client change. Clients must always honor `fallback` while loading or if the image is missing.
- **`create_tables.sql` drift — DECIDED: migrations are authoritative; `create_tables.sql` is reference only.** The live schema already diverges from that file, so the theme schema ships as additive, idempotent migrations (`scripts/migrations/001_create_theme_tables.js`, `002_seed_themes.js`) that target the live DB. The theme DDL has also been appended to `create_tables.sql` for documentation, behind a comment that flags the file as known-stale and points at the migrations. Full reconciliation of `create_tables.sql` with the live DB remains a separate, out-of-band cleanup.

### Remaining risks to watch (not blockers)

- **Client parity is the highest-risk phase (P2).** Baking the literals into `system_default` must be pixel-identical before/after the refactor on both clients; gate P2 on the snapshot tests in §13.
- **Token/schema lockstep.** The schema is the single source of truth; the Swift and Kotlin model structs must track it field-for-field. Unknown keys are ignored and missing keys take documented defaults, which limits the blast radius of drift but does not eliminate it.

---

## 15. Artifacts built (P0–P1)

Concrete artifacts now in the repo, implementing the phases above through P1:

- `docs/theme.schema.v1.json` — JSON Schema (draft-07) for the v1 definition. Authoritative token list; expanded from the §4 sketch to carry every literal needed for pixel parity (full type-size set, fill objects for solid/gradient/image_blur, header/footer/component toggles).
- `docs/themes/system_default.json` — tokens transcribed from the current iPad literals (dark navy gradient `#0D0F33`→`#141F47`→`#0D0F33`, white/`#999999` text, royal-blue→purple NOW card, green past events). After the P2 refactor this must render identically to today.
- `docs/themes/vcu_light.json` — the "What's Happening Today" example (light panel, gold accent/NOW card, large centered date, bottom ticker, past events + facilitators hidden).
- `scripts/migrations/001_create_theme_tables.js` — **P0.** Idempotent: creates `themes`, adds `tenants.default_theme_id` and `rooms.theme_id` with `ON DELETE SET NULL`.
- `scripts/migrations/002_seed_themes.js` — **P0.** Upserts both global themes from the canonical JSON (matched on `tenant_id IS NULL` + `key_name`); `system_default` seeded with `is_system = 1`.
- `src/lib/themes.ts` — **P1.** `resolveThemeForRoom(roomId)` and a batched `resolveThemesForRooms(rooms)` implementing room > tenant > system precedence with a bounded query count; pre-migration-safe (returns `null` if the table is absent).
- `src/app/api/rooms/route.ts` — **P1.** `GET` now selects `r.theme_id` + `t.default_theme_id` and attaches `resolved_theme` to each row. Additive and fail-soft: on any resolution error it serves rows with `resolved_theme: null`.
- `docs/THEMES.md` — authoring guide and token reference (see §10).

Run order against the live DB: `node scripts/migrations/001_create_theme_tables.js` then `node scripts/migrations/002_seed_themes.js`.

Not yet built (later phases): client theming refactor (P2), thumbnail script + assignment UI + `/api/themes` (P3–P4), SSE live push (P5).
