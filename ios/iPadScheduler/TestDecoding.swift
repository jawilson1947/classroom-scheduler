import Foundation

let json = """
[{"id":5,"tenant_id":3,"building_id":7,"name":"Computer Room ","capacity":0,"building_name":"166 Sarah Jane","tenant_name":"Wilson International","tenant_address":"166 Sarah Jane Drive, Madison AL 35757","linked_device_id":25,"pairing_code":"URL-AFC408","last_seen_at":"2025-12-10T20:57:21.000Z"}]
""".data(using: .utf8)!

struct Room: Codable, Identifiable {
    let id: Int
    let name: String
    let buildingName: String
    let tenantName: String?
    let tenantAddress: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case buildingName = "building_name"
        case tenantName = "tenant_name"
        case tenantAddress = "tenant_address"
    }
}

do {
    let rooms = try JSONDecoder().decode([Room].self, from: json)
    print("Success: \(rooms)")
} catch {
    print("Error: \(error)")
}
