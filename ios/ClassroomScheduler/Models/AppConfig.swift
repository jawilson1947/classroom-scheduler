import Foundation

struct AppConfig: Codable {
    let roomId: Int
    let tenantId: Int
    let apiBaseURL: String
    
    enum CodingKeys: String, CodingKey {
        case roomId
        case tenantId
        case apiBaseURL
    }
}
