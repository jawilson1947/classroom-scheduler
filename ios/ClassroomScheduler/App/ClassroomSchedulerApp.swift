import SwiftUI

@main
struct ClassroomSchedulerApp: App {
    @StateObject private var configService = ConfigurationService()
    
    var body: some Scene {
        WindowGroup {
            if configService.isConfigured {
                DisplayView()
                    .environmentObject(configService)
            } else {
                ConfigurationView()
                    .environmentObject(configService)
            }
        }
    }
}
