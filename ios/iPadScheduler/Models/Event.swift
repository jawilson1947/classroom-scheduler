import Foundation
//jaw 12/08/2025
struct Event: Codable, Identifiable {
    let id: Int
    let title: String
    let facilitatorName: String?
    let startTime: String
    let endTime: String
    let description: String?
    let narrative: String?
    let recurrenceDays: String?
    let dailyStartTime: String?
    let dailyEndTime: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case facilitatorName = "facilitator_name"
        case startTime = "start_time"
        case endTime = "end_time"
        case description
        case narrative
        case recurrenceDays = "recurrence_days"
        case dailyStartTime = "daily_start_time"
        case dailyEndTime = "daily_end_time"
    }
    
    // Computed properties for display
    var displayStart: Date? {
        if recurrenceDays != nil,
           let dailyStart = dailyStartTime {
            return parseTimeForToday(dailyStart)
        }
        return Event.date(from: startTime)
    }
    
    var displayEnd: Date? {
        if recurrenceDays != nil,
           let dailyEnd = dailyEndTime {
            return parseTimeForToday(dailyEnd)
        }
        return Event.date(from: endTime)
    }
    
    var isRecurring: Bool {
        recurrenceDays != nil
    }
    
    func occursToday() -> Bool {
        let calendar = Calendar.current
        let today = Date()
        let todayStart = calendar.startOfDay(for: today)
        
        if let recurrenceDays = recurrenceDays {
            // Check date range first
            guard let start = Event.date(from: startTime),
                  let end = Event.date(from: endTime) else {
                print("[Event] ❌ Failed to parse dates for recurring event: \(title)")
                return false
            }
            
            // Check if today is within the event's overall date range
            
            if todayStart < calendar.startOfDay(for: start) || todayStart > calendar.startOfDay(for: end) {
                return false
            }
            
            // Check if today is one of the recurrence days
            // Check if today is one of the recurrence days
            // Robust check: Map numeric weekday to 3-letter code manually
            // 1 = Sun, 2 = Mon, etc.
            let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            let weekday = Calendar.current.component(.weekday, from: today)
            let todayDay = days[weekday - 1]
            
            return recurrenceDays.contains(todayDay)
        }
        
        // For non-recurring events, check if they occur today
        guard let start = displayStart, let end = displayEnd else { return false }
        
        return calendar.isDate(start, inSameDayAs: today) ||
               calendar.isDate(end, inSameDayAs: today) ||
               (start < today && end > today)
    }
    
    private func parseTimeForToday(_ timeString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        guard let time = formatter.date(from: timeString) else { return nil }
        
        let calendar = Calendar.current
        let now = Date()
        let components = calendar.dateComponents([.hour, .minute, .second], from: time)
        return calendar.date(bySettingHour: components.hour ?? 0,
                            minute: components.minute ?? 0,
                            second: components.second ?? 0,
                            of: now)
    }
    
    // Helper for flexible date parsing
    static func date(from string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        // Try standard format
        if let date = formatter.date(from: string) {
            return date
        }
        
        // Try with fractional seconds
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: string)
    }
}

struct Room: Codable, Identifiable {
    let id: Int
    let name: String
    let buildingName: String
    let tenantName: String?
    let tenantAddress: String?
    let tenantLogoUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case buildingName = "building_name"
        case tenantName = "tenant_name"
        case tenantAddress = "tenant_address"
        case tenantLogoUrl = "tenant_logo_url"
    }
}
