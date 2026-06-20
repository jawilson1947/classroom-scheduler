# Display Themes — Authoring Guide

How display themes work, what every token means, and how to add a new one. The implementation plan is in [`THEME_ENGINE_PLAN.md`](./THEME_ENGINE_PLAN.md); this guide is the day-to-day reference for authoring definitions.

## What a theme is

A theme is a JSON document that combines a **layout archetype** (a coded template both native clients know how to render) with **design tokens** (colors, type sizes, text, and visibility toggles). Colors, fonts, text, and toggles are pure data and change with **no app release**. The structural layout is one of a small enumerated set of archetypes shared by the iPad (SwiftUI) and Android (Compose) clients.

Themes are stored in the `themes` table and validated against [`theme.schema.v1.json`](./theme.schema.v1.json). The two seeded definitions live in [`themes/`](./themes/): `system_default.json` (the standard dark board, `is_system = 1`) and `vcu_light.json` (the "What's Happening Today" example).

## How a theme reaches a screen

1. A theme is assigned to a **room** (`rooms.theme_id`) or set as the **tenant default** (`tenants.default_theme_id`).
2. On `GET /api/rooms`, the server resolves the effective theme per room — **room override → tenant default → `system_default`** — and attaches it as `resolved_theme` (see `src/lib/themes.ts`).
3. The client reads `resolved_theme` from the room payload it already fetches and renders the `layout` archetype with the tokens. If the field is absent/null or `layout` is unknown, the client falls back to its built-in `system_default`.

Because resolution is server-side, clients never implement precedence and older shipped apps simply ignore the new field.

## Authoring a definition

Every field except `schemaVersion` and `layout` is optional and falls back to a documented default, so a definition only needs to state what differs from the default look. Start from `themes/system_default.json` and change tokens.

```jsonc
{
  "schemaVersion": 1,          // required, must be 1
  "layout": "agenda_list",     // required; only archetype in v1
  "colors": { /* ... */ },
  "typography": { /* ... */ },
  "header": { /* ... */ },
  "components": { /* ... */ },
  "footer": { /* ... */ }
}
```

### Colors

Plain colors are `#RRGGBB` or `#RRGGBBAA` hex. `background` and `currentEvent` also accept a **fill object**.

| Token | Meaning | Default look |
|---|---|---|
| `background` | Whole-screen fill (see fills below) | dark navy gradient |
| `panel` | Event card background | `#141F47` |
| `panelOpacityPast` | Dimming applied to a past event's panel (0–1) | `0.5` |
| `panelBorder` | Event card border | `#404040` |
| `headerAccentBar` | Header accent bar; `null` = none | `null` |
| `tickerBar` / `tickerText` | Ticker background / text (only if `showTicker`) | `#16213E` / `#FFFFFF` |
| `primaryText` | Main text | `#FFFFFF` |
| `secondaryText` | Secondary text (building, dates, end times) | `#999999` |
| `accent` | Badges / highlights | `#FFFFFF` |
| `currentEvent` | Fill behind the NOW card (see fills) | royal-blue→purple gradient |
| `currentEventText` / `currentEventBorder` | NOW card text / border | `#FFFFFF` / `#FFFFFF4D` |
| `pastEventText` | Past event text | `#34C759` (green) |
| `dividerColor` | Header/footer hairlines | `#FFFFFF` |
| `onlineColor` / `offlineColor` | Status dot | `#34C759` / `#FF3B30` |

**Fills** (`background`, `currentEvent`) are either a hex string or one of:

```jsonc
{ "type": "solid", "color": "#E8B600" }
{ "type": "gradient", "colors": ["#0D0F33", "#141F47", "#0D0F33"], "start": "topLeading", "end": "bottomTrailing" }
{ "type": "image_blur", "url": null, "blurRadius": 24, "fallback": "#C9D2DA" }
```

Gradient `start`/`end` are one of `top, bottom, leading, trailing, topLeading, topTrailing, bottomLeading, bottomTrailing, center`. For `image_blur`, `url` points at a tenant-uploaded asset (reuse `/api/upload`); clients always honor `fallback` while loading or if the image is missing. **Background images are tenant assets referenced by URL — never bundled in the apps.**

### Typography

Sizes are points/dp at scale 1.0; `scale` multiplies all of them (one knob for display-size density). `fontFamily` is `"system"` in v1 — any other key falls back to system until a custom font is bundled in both apps.

`headingSize` (room/board title, 32) · `subheadingSize` (building, 14) · `clockSize` (24) · `dateSize` (13) · `eventTitleSize` (14) · `eventTimeSize` (13) · `eventEndTimeSize` (10) · `currentTitleSize` (18) · `currentTimeSize` (16) · `facilitatorSize` (11).

### Header

`title` (fixed board title, or `null` to use the room name) · `showRoomName` · `showBuildingName` · `showDate` · `showClock` · `showOnlineStatus` · `logoPosition` (`left|right|center|none`) · `dividers`.

### Components

`eventRow` (`title_left_time_right` | `time_left_title_right`) · `showCurrentEventHighlight` · `showFacilitator` · `showPastEvents` · `showTicker` + `tickerText` · `clockPosition` (`header_right|header_center|bottom_left|bottom_right`) · `cornerRadius` · `showRefreshButton`.

### Footer

`show` · `showVersion` · `showTenantInfo` (the centered `<tenant> | <address>` line).

## Validate before you ship

Definitions are validated against the schema in the seed/management path. To check locally:

```bash
npx ajv-cli validate -s docs/theme.schema.v1.json -d "docs/themes/*.json"
```

## Registering a theme

**Global theme** (available to every tenant) — add a row to the `THEMES` list in `scripts/migrations/002_seed_themes.js` with `tenant_id = NULL` and re-run it (the seed is an idempotent upsert), or use `POST /api/themes` (SYSTEM_ADMIN) once that endpoint ships in P4.

**Tenant-branded theme** — same, but set `tenant_id` to that tenant. No schema change is needed for per-tenant themes.

After registering, generate the theme's thumbnail (the Playwright script in §8 of the plan) so it appears truthfully in the assignment grid.

## Adding a new layout archetype (developer task)

Tokens cover color/text/visibility. A genuinely new **structure** (e.g. a grid or poster) is the only thing that requires code and an app release:

1. Add the new value to the `layout` enum in `theme.schema.v1.json`.
2. Implement the archetype view in **both** clients — a SwiftUI view selected by `LayoutRouter`, and a Compose composable selected by the Android layout router — consuming the same tokens.
3. Keep the Swift/Kotlin model structs in lockstep with the schema (single source of truth in `docs/`).
4. Author a definition that uses the new `layout`, validate, register, and generate a thumbnail.

Until a client ships support for a new `layout`, it falls back to `system_default` for that value — so the schema and clients can be rolled out independently without breaking displays.
