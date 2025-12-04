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
        
        self.config = config
        self.isConfigured = true
    }
}
