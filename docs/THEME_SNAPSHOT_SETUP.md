# Pixel-Parity Snapshot Gate — Setup & Baseline Recording

_Phase 2b, step 2 (gate-first). These steps run on a machine with the Xcode / Android toolchains — they can't run in the Cowork sandbox. Stand the gate up and record **pre-refactor baselines** before any view refactor (steps 4 & 6) is merged._

Decisions in force: **D3** = `swift-snapshot-testing` (iOS) + `Roborazzi` (Android). **D1** = converge to iOS, so Android's post-refactor baseline will legitimately differ from its pre-refactor baseline on exactly two colors (background outer stops `#0D0F14`→`#0D0F33`, past-event green `#4ADE80`→`#34C759`) — re-record those after the refactor and note them as intended.

---

## Why a determinism pass is required first

Both display views animate and read the wall clock, which makes naive snapshots flaky:

- **iOS** — `CurrentEventView` runs a repeating pulse (`isAnimating`, DisplayView.swift CurrentEventView ~:143–145) and the header shows live time/date (DisplayView.swift HeaderView ~:262–267).
- **Android** — `CurrentEventCard` animates the NOW dot alpha (CurrentEventCard.kt ~:96) and the header shows live time.

So the snapshot harness must: inject a **fixed clock** (e.g. `2026-06-19 10:30 local`), inject a **fixed sample event set** (one past, one current, two upcoming, each with/without facilitator + narrative), and **disable animations** (capture the settled frame). This also requires the views to accept injected data/time rather than pulling from the live service/viewmodel — that small injectability change lands with the plumbing step (3 / 5), and the per-view snapshot tests are added at that point. This doc covers the harness, dependencies, and record/verify commands.

---

## iOS — swift-snapshot-testing

**1. Add the package** (Xcode → File → Add Package Dependencies):
`https://github.com/pointfreeco/swift-snapshot-testing` — up to next major from `1.17.0`.

**2. Add a Unit Test target** if none exists: Xcode → File → New → Target → *Unit Testing Bundle*, name `iPadSchedulerSnapshotTests`, host app = the app target. (The project currently has no test target — `ios/iPadScheduler/ClassroomScheduler/ClassroomScheduler.xcodeproj`.) Link `SnapshotTesting` to this target only.

> **Test sources are written** — add these to the new test target (drag into Xcode with the test target checked):
> `ios/iPadScheduler/SnapshotTests/SampleData.swift` and `ios/iPadScheduler/SnapshotTests/DisplayParityTests.swift`.
> They host `DisplayView` (injected fixtures, `animated:false`) plus `HeaderView` / `EventCardView` / `CurrentEventView` at fixed iPad sizes. The module name is assumed to be **`ClassroomScheduler`** (the app target's product) — `@testable import ClassroomScheduler`; adjust if your module differs. Recording: first run writes `__Snapshots__/` and reports a failure; commit the images and re-run to go green.

**3. Determinism harness** (illustrative — the provided files implement this):

```swift
import SnapshotTesting
import SwiftUI
import XCTest
@testable import iPadScheduler   // adjust to the app module name

final class DisplayParityTests: XCTestCase {
    // Pin device + OS; snapshots are sensitive to both.
    private let sizes: [(String, CGSize)] = [
        ("ipad_landscape", CGSize(width: 1366, height: 1024)),
        ("ipad_portrait",  CGSize(width: 1024, height: 1366)),
    ]
    private let fixedNow = ISO8601DateFormatter().date(from: "2026-06-19T10:30:00Z")!

    func test_systemDefault_agenda() {
        for (name, size) in sizes {
            // The view must accept injected events + a fixed `now`, and disable
            // the NOW-card animation in test mode (added in the plumbing step).
            let view = DisplayView(/* events: SampleEvents.all, now: fixedNow, theme: .systemDefault, animated: false */)
                .frame(width: size.width, height: size.height)
            let vc = UIHostingController(rootView: view)
            vc.view.frame = CGRect(origin: .zero, size: size)
            assertSnapshot(of: vc, as: .image(precision: 1.0), named: name)  // precision 1.0 = exact
        }
    }
}
```

**4. Record baselines (pre-refactor):** run once with `record = true` (set `SnapshotTesting.isRecording = true` in `setUp()` or `withSnapshotTesting(record: .all)`), commit the generated `__Snapshots__/`. Then set recording off; CI re-runs and fails on any diff. Pin the simulator (e.g. *iPad Pro 13-inch (M4)*, a fixed iOS version) in the CI lane.

iOS tolerance: **precision 1.0 (exact)** — tokens equal the current literals, so post-refactor must match the pre-refactor baseline pixel-for-pixel.

---

## Android — Roborazzi

**1. Dependencies.** In `android/app/build.gradle(.kts)` add the plugin and test deps (JVM unit tests via Robolectric — no emulator):

```kotlin
plugins { id("io.github.takahirom.roborazzi") version "1.32.0" }

android { testOptions { unitTests { isIncludeAndroidResources = true } } }

dependencies {
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.32.0")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.32.0")
    testImplementation("org.robolectric:robolectric:4.13")
    testImplementation("androidx.compose.ui:ui-test-junit4:<compose-version>")
    testImplementation("junit:junit:4.13.2")
}
```
(There is currently no `test`/`androidTest` source set — create `android/app/src/test/java/...`.)

> **Test sources are written** — `android/app/src/test/java/com/classroomscheduler/snapshot/SampleData.kt` and `DisplayParityTest.kt` (auto-included by Gradle once the deps above are added). They capture `AgendaBoard` + `CurrentEventCard` + `EventCard` with fixed `now`/events and `animated=false`.

**2. Determinism + capture** (illustrative — the provided files implement this):

```kotlin
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w1366dp-h1024dp-xhdpi")   // fixed size/density
class DisplayParityTest {
    @get:Rule val compose = createComposeRule()

    @Test fun systemDefault_agenda() {
        compose.setContent {
            // Inject fixed events + clock; pass animationsEnabled = false (added in plumbing step).
            DisplayScreen(/* events = SampleEvents.all, now = FIXED_NOW,
                             theme = ThemeDefinition.systemDefault(), animationsEnabled = false */)
        }
        compose.onRoot().captureRoboImage("src/test/snapshots/systemDefault_agenda_landscape.png")
    }
}
```

**3. Record / verify commands:**
- Record baselines: `./gradlew :app:recordRoborazziDebug`
- Verify in CI: `./gradlew :app:verifyRoborazziDebug` (fails on diff)
- Re-record after the convergence shift: `./gradlew :app:recordRoborazziDebug` (then commit; the only changed pixels should be the two D1 colors — review the diff to confirm).

Android tolerance: exact elsewhere; the **2 D1 color regions are the only expected change** between Android's pre- and post-refactor baselines.

---

## Gate wiring (both platforms)

1. Record pre-refactor baselines now (this step) and commit them.
2. CI: an iOS lane (`xcodebuild test` on the pinned simulator) and an Android lane (`verifyRoborazziDebug`). Both must be green to merge the view-refactor PRs.
3. After iPad refactor (step 4): iOS lane must stay green at precision 1.0.
4. After Android refactor (step 6): re-record, confirm the diff is *only* the two D1 colors, commit the new baseline with a note.

## Hand-back checklist before the view refactor

- [ ] Both apps **build** with the new `Theme`/`ThemeDefinition` models + `resolvedTheme` on `Room` (plumbing already written; confirm it compiles in your toolchain).
- [ ] Snapshot deps added; test targets/source sets created.
- [ ] Pre-refactor baselines recorded and committed for both platforms.
- [ ] CI lanes wired and green.

Once these are checked, I'll proceed to the plumbing wiring (ThemeProvider / `LocalDisplayTheme`, LayoutRouter, view injectability) and then the token refactor of the views, keeping each platform's gate green.
