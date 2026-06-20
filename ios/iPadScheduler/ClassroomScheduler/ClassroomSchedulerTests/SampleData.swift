import Foundation
@testable import ClassroomScheduler
// NOTE: module name = the app target's product module ("ClassroomScheduler").
// If your target uses a different module name, adjust the import above.

/// Deterministic fixtures for snapshot tests. Built by decoding JSON so they
/// exercise the real Codable path the app uses. Times are absolute UTC around a
/// fixed `now` (10:30Z) so the agenda splits into one past, one current, two
/// upcoming events regardless of when the test runs.
enum SampleData {
    /// Pin this in the test host (see DisplayParityTests.setUp) so time/date text renders deterministically.
    static let timeZone = TimeZone(identifier: "UTC")!

    static let now: Date = ISO8601DateFormatter().date(from: "2026-06-19T10:30:00Z")!

    static let eventsJSON = """
    [
      {"id":1,"title":"Morning Assembly","facilitator_name":"Ms. Reyes","Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T09:00:00Z","end_time":"2026-06-19T09:45:00Z","description":null,"narrative":null,"recurrence_days":null,"daily_start_time":null,"daily_end_time":null},
      {"id":2,"title":"English Literature","facilitator_name":"Mr. Thompson","Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T10:00:00Z","end_time":"2026-06-19T11:00:00Z","description":null,"narrative":"<p>Reading Chapter 5.</p>","recurrence_days":null,"daily_start_time":null,"daily_end_time":null},
      {"id":3,"title":"Chemistry Lab","facilitator_name":"Dr. Patel","Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T11:30:00Z","end_time":"2026-06-19T12:15:00Z","description":null,"narrative":null,"recurrence_days":null,"daily_start_time":null,"daily_end_time":null},
      {"id":4,"title":"Study Hall","facilitator_name":null,"Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T13:00:00Z","end_time":"2026-06-19T14:00:00Z","description":null,"narrative":null,"recurrence_days":null,"daily_start_time":null,"daily_end_time":null}
    ]
    """

    static let roomJSON = """
    {"id":10,"name":"121 - English Classroom","building_name":"High School Building","tenant_name":"Oakwood Adventist Academy","tenant_address":"5378 Adventist Blvd., Huntsville AL 35896","tenant_logo_url":null,"resolved_theme":null}
    """

    static var events: [Event] {
        (try? JSONDecoder().decode([Event].self, from: Data(eventsJSON.utf8))) ?? []
    }

    static var room: Room {
        try! JSONDecoder().decode(Room.self, from: Data(roomJSON.utf8))
    }

    static var currentEvent: Event? {
        events.first { e in
            guard let s = e.displayStart, let en = e.displayEnd else { return false }
            return now >= s && now <= en
        }
    }

    static var upcomingEvent: Event? {
        events.first { ($0.displayStart ?? .distantPast) > now }
    }
}
