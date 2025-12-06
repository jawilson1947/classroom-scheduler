import Foundation
import Combine

class ConfigurationService: ObservableObject {
    @Published var config: AppConfig?
    @Published var isConfigured: Bool = false
    
    init() {
        loadConfiguration()
    }
    
    func loadConfiguration() {
        // Try to load from MDM managed configuration
        if let mdmConfig = loadFromMDM() {
            self.config = mdmConfig
            self.isConfigured = true
            return
        }
        
        // Try to load from UserDefaults (for testing)
        if let savedConfig = loadFromUserDefaults() {
            self.config = savedConfig
            self.isConfigured = true
            return
        }
        
        // Try to load from environment variables (for Xcode debugging)
        if let envConfig = loadFromEnvironment() {
            self.config = envConfig
            self.isConfigured = true
            return
        }
        
        self.isConfigured = false
    }
    
    private func loadFromMDM() -> AppConfig? {
        guard let managedConfig = UserDefaults.standard.dictionary(forKey: "com.apple.configuration.managed") else {
            return nil
        }
        
        guard let roomId = managedConfig["roomId"] as? Int,
              let tenantId = managedConfig["tenantId"] as? Int,
              let apiBaseURL = managedConfig["apiBaseURL"] as? String else {
            return nil
        }
        
        return AppConfig(roomId: roomId, tenantId: tenantId, apiBaseURL: apiBaseURL)
    }
    
    private func loadFromUserDefaults() -> AppConfig? {
        guard let roomId = UserDefaults.standard.object(forKey: "roomId") as? Int,
              let tenantId = UserDefaults.standard.object(forKey: "tenantId") as? Int,
              let apiBaseURL = UserDefaults.standard.string(forKey: "apiBaseURL") else {
            return nil
        }
        
        return AppConfig(roomId: roomId, tenantId: tenantId, apiBaseURL: apiBaseURL)
    }
    
    private func loadFromEnvironment() -> AppConfig? {
        guard let roomIdStr = ProcessInfo.processInfo.environment["ROOM_ID"],
              let roomId = Int(roomIdStr),
              let tenantIdStr = ProcessInfo.processInfo.environment["TENANT_ID"],
              let tenantId = Int(tenantIdStr),
              let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] else {
            return nil
        }
        
        return AppConfig(roomId: roomId, tenantId: tenantId, apiBaseURL: apiBaseURL)
    }
    
    func saveConfiguration(_ config: AppConfig) {
        UserDefaults.standard.set(config.roomId, forKey: "roomId")
        UserDefaults.standard.set(config.tenantId, forKey: "tenantId")
        UserDefaults.standard.set(config.apiBaseURL, forKey: "apiBaseURL")
        
        // Notify observers on main thread
        DispatchQueue.main.async {
            self.config = config
            self.isConfigured = true
        }
    }
    
    func validatePairingToken(_ token: String, apiBaseURL: String, completion: @escaping (Result<AppConfig, Error>) -> Void) {
        let urlString = "\(apiBaseURL)/api/device/validate-token"
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["token": token]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode),
                  let data = data else {
                completion(.failure(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response or token"])))
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let roomId = json["room_id"] as? Int,
                   let tenantId = json["tenant_id"] as? Int {
                    
                    let config = AppConfig(roomId: roomId, tenantId: tenantId, apiBaseURL: apiBaseURL)
                    completion(.success(config))
                } else {
                    completion(.failure(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response format"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
