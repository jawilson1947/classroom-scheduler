import Foundation
//jaw 12/8/2025
struct AppConfig: Codable {
    let roomId: Int
    let tenantId: Int
    let apiBaseURL: String
    let deviceId: Int?
    
    enum CodingKeys: String, CodingKey {
        case roomId
        case tenantId
        case apiBaseURL
        case deviceId
    }
}
