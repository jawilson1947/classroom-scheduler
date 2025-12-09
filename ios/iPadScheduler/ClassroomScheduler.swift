import SwiftUI

@main
struct iPadClassroomSchedulerApp: App {
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
