# Phase 2b — Client Theming Refactor Plan (iPad + Android)

_This maps every literal to a token, defines the pixel-parity gate, and proposes a phased order._

> **Decisions locked (2026-06-19):**
> **D1 = converge to iOS** — `system_default` keeps the iOS color values; Android converges to them and records its 2 color deltas (background outer stops, past-event green) as the new accepted baseline.
> **D2 = derive `+4`** — the NOW card renders at `components.cornerRadius + 4`; no separate token.
> **D3 = swift-snapshot-testing (iOS) + Roborazzi (Android)** for the parity gate.
> **D4 = parity-only first** — refactor only what `system_default` needs for pixel parity; defer `vcu_light` archetype features (ticker, image_blur background, centered date, `eventRow` swap) to a follow-up pass. The Theme model still *decodes* the full schema (forward-compatible), but the view layer renders only the parity subset for now.

Server side is done and verified: `/api/rooms` now returns `resolved_theme` (room > tenant > system), and a room with no override resolves to `system_default` whose definition is the canonical token set in `docs/themes/system_default.json`.

---

## 0. Critical finding — the two clients already diverge (affects the parity gate)

The iPad and Android builds are **not** pixel-identical today. Three literals differ:

| Token | iPad literal | Android literal | In `system_default.json` |
|---|---|---|---|
| Background gradient outer stops | `rgb(0.05,0.06,0.20)` = **`#0D0F33`** (DisplayView.swift:17,19) | **`#0D0F14`** (DisplayScreen.kt:44,46) | `#0D0F33` (iOS value) |
| Past-event text/green | `Color.green` ≈ **`#34C759`** (EventCardView.swift:18,26,85) | **`#4ADE80`** (EventCard.kt:56,75,99) | `#34C759` (iOS value) |
| Current-event shadow tint | `Color.blue` ≈ `#007AFF` (CurrentEventView.swift:143) | `#3B82F6` (CurrentEventCard.kt:61) | n/a (shadow not tokenized in v1) |

Consequence: a single shared `system_default` JSON cannot be simultaneously pixel-identical to **both** current builds. I seeded it with the **iOS** values. So:

- **iPad** reading `system_default` → pixel-identical to today (tokens equal the literals). A 0-tolerance gate passes.
- **Android** reading the same `system_default` → background outer stops shift `#0D0F14`→`#0D0F33` and past-event green shifts `#4ADE80`→`#34C759`. A strict before/after gate on Android would **fail** on those pixels.

**Decision needed (D1):** how to treat Android's pre-existing divergence —

- **(a) Converge to iOS (recommended):** accept the Android color shift as an intended fix; record Android's snapshot baseline *after* setting tokens, and document the 2 color deltas as expected. Net result: both platforms match `system_default` and each other.
- **(b) Preserve each platform exactly:** give `system_default` per-platform values — not possible with one definition; would require a platform key in the schema (scope creep, not recommended).
- **(c) Converge to Android values instead:** flip the two tokens in `system_default.json` to `#0D0F14`/`#4ADE80`; then iPad shifts instead. Only sensible if Android is considered the reference.

Everything below assumes **(a)**. Flag if you prefer otherwise — it changes the Android baseline step only.

---

## 1. iPad (SwiftUI) literal → token map

Target files: `ios/iPadScheduler/Views/{DisplayView,EventCardView,CurrentEventView}.swift` (HeaderView is inside DisplayView.swift).

| Literal (file:line) | Current value | Token in `resolved_theme.definition` |
|---|---|---|
| DisplayView.swift:16–20 background `LinearGradient` | navy 3-stop | `colors.background` (gradient fill) |
| DisplayView.swift:29,40,117 divider `.fill(.white)` | white | `colors.dividerColor` + `header.dividers`/`footer.show` |
| DisplayView.swift:250 room name `.system(size:32,bold)` / :251 `.white` | 32 / white | `typography.headingSize` / `colors.primaryText` |
| DisplayView.swift:254–255 building `.system(14)` / `Color(white:0.6)` | 14 / #999 | `typography.subheadingSize` / `colors.secondaryText` |
| DisplayView.swift:262–263 clock `.system(24,bold)` / `.white` | 24 / white | `typography.clockSize` / `colors.primaryText` (+ `header.showClock`,`components.clockPosition`) |
| DisplayView.swift:266–267 date `.system(13)` / `Color(white:0.6)` | 13 / #999 | `typography.dateSize` / `colors.secondaryText` (+ `header.showDate`) |
| DisplayView.swift:271,275 status dot/text green/red | green/red | `colors.onlineColor`/`colors.offlineColor` (+ `header.showOnlineStatus`) |
| DisplayView.swift:125–133 footer text `.system(13)`/`.white .9` | 13 | `typography` (footer) / `colors.primaryText` (+ `footer.showVersion`,`showTenantInfo`) |
| DisplayView.swift:154–157 refresh button | — | `components.showRefreshButton` |
| EventCardView.swift:99–105 panel `#141F47`, past `.opacity(.5)`, radius 12, border `Color(white:0.25)` | — | `colors.panel`, `colors.panelOpacityPast`, `components.cornerRadius`, `colors.panelBorder` |
| EventCardView.swift:17/25 title `.system(14,semibold)` | 14 | `typography.eventTitleSize` |
| EventCardView.swift:18,26,85,92 past/active text colors | green/white/#999 | `colors.pastEventText` / `colors.primaryText` / `colors.secondaryText` |
| EventCardView.swift:84 start `.system(13,medium)` / :91 end `.system(10)` | 13 / 10 | `typography.eventTimeSize` / `eventEndTimeSize` |
| EventCardView.swift:33 facilitator `.system(11)` | 11 | `typography.facilitatorSize` (+ `components.showFacilitator`) |
| CurrentEventView.swift:126–129 NOW gradient royal→purple | — | `colors.currentEvent` (gradient fill) |
| CurrentEventView.swift:45/53 title `.system(18,bold)` :46 `.white` | 18 / white | `typography.currentTitleSize` / `colors.currentEventText` |
| CurrentEventView.swift:111 time `.system(16,bold)` | 16 | `typography.currentTimeSize` |
| CurrentEventView.swift:138/141 radius 16 / border `.white .3` | — | `components.cornerRadius` / `colors.currentEventBorder` |
| (no literal) past-events section, header board title | — | `components.showPastEvents`, `header.title` (null ⇒ room name), `components.eventRow` |

Note: `cornerRadius` is 12 on regular cards but 16 on the NOW card in the current build. v1 schema has one `components.cornerRadius`. Proposal: keep the NOW card's radius as `cornerRadius + 4` in the layout code (preserves today's look at radius 12 ⇒ 16) rather than adding a second token. Flag if you'd rather add `currentCornerRadius`.

## 2. Android (Compose) literal → token map

Target files: `presentation/display/DisplayScreen.kt`, `presentation/display/components/{HeaderView,EventCard,CurrentEventCard,FooterView}.kt`. (Mirror of iOS; same tokens.)

| Literal (file:line) | Current value | Token |
|---|---|---|
| DisplayScreen.kt:42–46 bg `Brush.linearGradient` | `#0D0F14/#141F47/#0D0F14` | `colors.background` (→ becomes `#0D0F33` outer under D1a) |
| DisplayScreen.kt:129–130 empty-state `16.sp`/`#808080` | — | `typography`/`colors.secondaryText` |
| DisplayScreen.kt:155,160 refresh button | — | `components.showRefreshButton` |
| HeaderView.kt:41–42,111–112 dividers `.background(White)` | white | `colors.dividerColor` + `header.dividers` |
| HeaderView.kt:55–57 room `32.sp/Bold/White` | 32 | `typography.headingSize`/`colors.primaryText` |
| HeaderView.kt:62–63 building `14.sp/#999999` | 14 | `typography.subheadingSize`/`colors.secondaryText` |
| HeaderView.kt:72–74 clock `24.sp/Bold` | 24 | `typography.clockSize` |
| HeaderView.kt:79–80 date `13.sp/#999999` | 13 | `typography.dateSize` |
| HeaderView.kt:90–100 status dot/text green/red | — | `colors.onlineColor`/`offlineColor` |
| EventCard.kt:33 panel `#141F47` α(0.5 past)/:38 border `#404040`/:34,39 radius 12 | — | `colors.panel`,`panelOpacityPast`,`panelBorder`,`components.cornerRadius` |
| EventCard.kt:54–56 title `14.sp/SemiBold`, past `#4ADE80` | 14 | `typography.eventTitleSize`, `colors.pastEventText` (→ `#34C759` under D1a) |
| EventCard.kt:74–75 facilitator `11.sp` | 11 | `typography.facilitatorSize` |
| EventCard.kt:97,107 time `13.sp`/`10.sp` | 13/10 | `typography.eventTimeSize`/`eventEndTimeSize` |
| CurrentEventCard.kt:64–70 NOW `Brush.linearGradient` royal→purple, radius 16 | — | `colors.currentEvent`, `components.cornerRadius(+4)` |
| CurrentEventCard.kt:61 shadow `#3B82F6 α.3` | — | not tokenized v1 (keep literal) |
| CurrentEventCard.kt:115–117 title `18.sp/Bold/White` | 18 | `typography.currentTitleSize`/`colors.currentEventText` |
| CurrentEventCard.kt:156–158 time `16.sp/Bold` | 16 | `typography.currentTimeSize` |
| FooterView.kt:27–28 divider `White α.5`, :39–48 text `13.sp/White α.9` | — | `colors.dividerColor`/`footer.*`/`typography` |

## 3. Client plumbing (both platforms)

**iPad:**
1. `Models/Theme.swift` (new): `Codable` `ThemeDefinition` + nested `ThemeColors`/`Typography`/`Header`/`Components`/`Footer`, plus a `Fill` enum (solid/gradient/image_blur) and `hex→Color`/`gradient` helpers. Lenient decoding (unknown keys ignored, defaults for missing) per schema.
2. `Models/Event.swift:123` `Room`: add `resolvedTheme: ThemeDefinition?` + `case resolvedTheme = "resolved_theme"`. (APIService already decodes `[Room]` at :35 — no networking change.)
3. `ThemeProvider: ObservableObject` injected as `@EnvironmentObject`; `DisplayView` reads it. `LayoutRouter` switches on `definition.layout` (only `agenda_list` in v1) → falls back to a bundled `system_default` for nil/unknown.
4. Refactor the views per the §1 map.

**Android (mirror):**
1. `data/models/ThemeDefinition.kt` (new) with Gson `@SerializedName`, same shape; `Room.kt:5` gains `@SerializedName("resolved_theme") val resolvedTheme: ThemeDefinition?`. `ApiService.getRooms()` (:11) unchanged.
2. `LocalDisplayTheme` `CompositionLocal` provided at `DisplayScreen` root; components read it. Layout-router composable on `layout`. Same fallback to a bundled `system_default`.
3. Keep `presentation/theme/Theme.kt` (Material chrome) separate — display theme is independent.

Both clients bundle a copy of `system_default.json` as the offline/parse-failure fallback. Field names/enums stay in lockstep with `docs/theme.schema.v1.json` (single source of truth).

## 4. Pixel-parity snapshot gate

**Neither platform has any snapshot/test infrastructure today** (no XCTest target with SnapshotTesting on iOS; no Paparazzi/Roborazzi, no `test`/`androidTest` dirs on Android). So the gate has to be stood up first. Minimum-viable proposal:

**iPad — `swift-snapshot-testing` (pointfreeco)** in a new unit-test target:
- Host each view (`DisplayView`, `EventCardView` past+active, `CurrentEventView`, `HeaderView`) in a `UIHostingController` at fixed iPad sizes (e.g. 1024×768 and 1366×1024, both orientations).
- **Determinism:** inject a fixed `currentTime`, a fixed sample event set, and disable the NOW-card pulse (`CurrentEventView` animation at :143/:144 — gate on the settled state). Pin the simulator/OS (snapshots are device/OS-sensitive).
- Record baselines on the current build (pre-refactor). Re-run post-refactor reading `system_default`. Tolerance **0** for iOS (tokens == literals).

**Android — `Roborazzi` (recommended over Paparazzi for Compose):** JVM + Robolectric, no emulator (CI-friendly), good Compose support.
- `@Composable` capture of `DisplayScreen` and each component at fixed `DpSize`s with fixed time/data; disable the dot-alpha animation (CurrentEventCard.kt:96).
- Record baselines pre-refactor. Post-refactor, expect **2 intended deltas** under D1a (background outer stops, past-event green) — encode those as the new accepted baseline with a note, tolerance 0 elsewhere. (Paparazzi is simpler/pure-JVM but has thinner API coverage; Roborazzi is the safer pick. Open to Paparazzi if you prefer.)

**Gate wiring:** baselines committed under each platform's test resources; CI job per platform fails on any diff outside tolerance. P2 does not merge until green.

## 5. Proposed order of attack (each step independently reviewable)

1. **D1 decision** (convergence) — unblocks Android baseline semantics.
2. **Stand up snapshot infra + record pre-refactor baselines**, both platforms. No production code touched yet. _Gate exists before any refactor._
3. **iPad plumbing** (Theme model, Room decode, ThemeProvider, LayoutRouter) with views still using literals — snapshots stay green (no visual change).
4. **iPad view refactor** to tokens reading `system_default`; run gate (expect 0 diff).
5. **Android plumbing** (mirror).
6. **Android view refactor**; run gate (expect only the D1a deltas).
7. **Cross-surface check:** web `ThemePreview` (P4) vs device render for the same definition; and the `vcu_light` definition rendered on both to confirm a second theme works end-to-end.

Steps 3–4 (iPad) and 5–6 (Android) are parallelizable across the two platforms.

## 6. Decisions I need from you before editing

- **D1** — Android divergence: converge to iOS (a, recommended) / preserve per-platform (b) / converge to Android (c)?
- **D2** — NOW-card corner radius: derive as `cornerRadius + 4` (recommended) or add a `currentCornerRadius` token?
- **D3** — snapshot libraries: iOS `swift-snapshot-testing` + Android `Roborazzi` (recommended), or substitutes?
- **D4** — scope of this pass: refactor **only `system_default`-equivalent rendering** for parity first, and defer `vcu_light`-specific archetype features (ticker, image_blur background, centered date, `eventRow` swap) to a follow-up — or build the full token surface now?
