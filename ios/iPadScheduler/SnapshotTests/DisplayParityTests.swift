import XCTest
import SwiftUI
import SnapshotTesting
@testable import ClassroomScheduler

/// Pixel-parity gate for the display refactor (Phase 2b).
///
/// Recording baselines: there is no `record` flag to flip — on the first run any
/// missing baseline is written to `__Snapshots__/` and the test reports a failure.
/// Commit the generated images, then run again; it passes. After the token-swap
/// refactor, re-run: iOS must match at precision 1.0 (tokens == the old literals).
///
/// Determinism requirements (also pin these at the scheme level for CI):
///  - Fixed simulator + OS (snapshots are device/OS sensitive). Recommend iPad Pro 13".
///  - UTC timezone + en_US locale so time/date text is stable. Set the scheme's
///    environment `TZ=UTC` (most reliable); the setUp below is best-effort.
final class DisplayParityTests: XCTestCase {

    private let landscape = CGSize(width: 1366, height: 1024)
    private let portrait  = CGSize(width: 1024, height: 1366)

    override func setUp() {
        super.setUp()
        // Best-effort timezone pin; prefer also setting TZ=UTC in the scheme env.
        setenv("TZ", "UTC", 1)
    }

    private func host<V: View>(_ view: V, size: CGSize) -> UIViewController {
        let vc = UIHostingController(rootView: view.frame(width: size.width, height: size.height))
        vc.view.frame = CGRect(origin: .zero, size: size)
        return vc
    }

    /// Dark navy used by system_default, for component backgrounds in isolation.
    private var bg: Color { Color(red: 0.05, green: 0.06, blue: 0.20) }

    func test_systemDefault_fullScreen() {
        let view = DisplayView(
            injectedEvents: SampleData.events,
            injectedRoom: SampleData.room,
            injectedNow: SampleData.now,
            animated: false
        )
        .environmentObject(ConfigurationService())

        assertSnapshot(of: host(view, size: landscape), as: .image(precision: 1.0), named: "landscape")
        assertSnapshot(of: host(view, size: portrait),  as: .image(precision: 1.0), named: "portrait")
    }

    func test_header() {
        let header = HeaderView(
            roomName: SampleData.room.name,
            buildingName: SampleData.room.buildingName,
            currentTime: SampleData.now,
            isOnline: true
        )
        .padding(.horizontal, 32)
        .background(bg)
        assertSnapshot(of: host(header, size: CGSize(width: 1366, height: 120)),
                       as: .image(precision: 1.0), named: "header")
    }

    func test_eventCard_upcoming() {
        guard let event = SampleData.upcomingEvent else { return XCTFail("no upcoming fixture") }
        let card = EventCardView(event: event, isPast: false).padding(32).background(bg)
        assertSnapshot(of: host(card, size: CGSize(width: 864, height: 140)),
                       as: .image(precision: 1.0), named: "upcoming")
    }

    func test_eventCard_past() {
        let event = SampleData.events[0] // Morning Assembly (past at 10:30)
        let card = EventCardView(event: event, isPast: true).padding(32).background(bg)
        assertSnapshot(of: host(card, size: CGSize(width: 864, height: 140)),
                       as: .image(precision: 1.0), named: "past")
    }

    func test_currentEventCard() {
        guard let event = SampleData.currentEvent else { return XCTFail("no current fixture") }
        // animated:false -> settled, deterministic frame.
        let card = CurrentEventView(event: event, animated: false).padding(32).background(bg)
        assertSnapshot(of: host(card, size: CGSize(width: 864, height: 180)),
                       as: .image(precision: 1.0), named: "current")
    }
}
