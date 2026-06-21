import SwiftUI

//jaw 12/08/2025 

struct DisplayView: View {
    @EnvironmentObject var configService: ConfigurationService
    @State private var apiService: APIService?
    @State private var eventSource: EventSourceService?
    @State private var currentTime = Date()
  // jaw  
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    // MARK: - Injection for deterministic snapshots / previews
    // All default to nil/true so runtime behavior is unchanged; tests pass fixed
    // values to render a stable frame (fixed clock, fixed events, animations off).
    var injectedEvents: [Event]? = nil
    var injectedRoom: Room? = nil
    var injectedNow: Date? = nil
    var animated: Bool = true

    /// True when rendering from injected fixtures (snapshot/preview); skip networking.
    private var isInjected: Bool { injectedEvents != nil }
    private var effectiveNow: Date { injectedNow ?? currentTime }
    private var resolvedEvents: [Event] { injectedEvents ?? apiService?.events ?? [] }
    private var resolvedRoom: Room? { injectedRoom ?? apiService?.room }

    /// Active display theme, resolved server-side per room (room > tenant > system)
    /// with a layout-aware fallback to `system_default`. Under `system_default`
    /// every token below is 8-bit-identical to the literal it replaced.
    private var theme: ThemeDefinition { DisplayLayout.resolve(resolvedRoom?.resolvedTheme?.definition) }

    var body: some View {
        ZStack {
            // Background fill (token: colors.background)
            theme.colors.background.view
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    if theme.header.dividers {
                        Rectangle()
                            .fill(theme.colors.dividerColor.color)
                            .frame(height: 1)
                    }

                    HeaderView(
                        roomName: resolvedRoom?.name ?? "Loading...",
                        buildingName: resolvedRoom?.buildingName ?? "",
                        currentTime: effectiveNow,
                        isOnline: isDeviceOnline()
                    )

                    if theme.header.dividers {
                        Rectangle()
                            .fill(theme.colors.dividerColor.color)
                            .frame(height: 1)
                    }
                }
                .padding(.horizontal, 32)
                .padding(.top, 32)
                .padding(.bottom, 24)
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Current Event
                        if let currentEvent = getCurrentEvent() {
                            CurrentEventView(event: currentEvent, animated: animated)
                                .padding(.horizontal, 32)
                        }
                        
                        // Upcoming Events
                        let upcoming = getUpcomingEvents()
                        if !upcoming.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(upcoming) { event in
                                    EventCardView(event: event, isPast: false)
                                        .padding(.horizontal, 32)
                                }
                            }
                        }
                        
                        // Past Events (token: components.showPastEvents)
                        let past = getPastEvents()
                        if theme.components.showPastEvents && !past.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(past) { event in
                                    EventCardView(event: event, isPast: true)
                                        .padding(.horizontal, 32)
                                }
                            }
                        }
                        
                        // No events message
                        // No events message or Logo
                        if resolvedEvents.isEmpty && !(apiService?.isLoading ?? false) {
                            if let logoStats = resolvedRoom?.tenantLogoUrl,
                               let dataStart = logoStats.range(of: ";base64,"),
                               let data = Data(base64Encoded: String(logoStats[dataStart.upperBound...])),
                               let uiImage = UIImage(data: data) {
                                
                                VStack(spacing: 16) {
                                    Spacer()
                                        .frame(height: 60)
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(maxWidth: 400, maxHeight: 400)
                                        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                                    
                                    Text("No events scheduled")
                                        .font(.system(size: 16))
                                        .foregroundColor(Color(white: 0.5))
                                }
                                .frame(maxWidth: .infinity)
                                
                            } else {
                                Text("No events scheduled for today")
                                    .font(.system(size: 16))
                                    .foregroundColor(Color(white: 0.5))
                                    .padding(.top, 24)
                            }
                        }
                    }
                    .padding(.bottom, 32)
                }
                
                // Footer
                if theme.footer.show,
                   let room = resolvedRoom,
                   let tenantName = room.tenantName,
                   let tenantAddress = room.tenantAddress {
                    VStack(spacing: 12) {
                        Rectangle()
                            .fill(theme.colors.dividerColor.color)
                            .frame(height: 1)
                            .opacity(0.5)

                        ZStack {
                            // Version - Left Aligned (token: footer.showVersion)
                            if theme.footer.showVersion {
                                HStack {
                                    Text("Ver 2.5.3")
                                        .font(.system(size: 13))
                                        .foregroundColor(theme.colors.primaryText.color.opacity(0.9))
                                    Spacer()
                                }
                            }

                            // Tenant Info - Centered (token: footer.showTenantInfo)
                            if theme.footer.showTenantInfo {
                                Text("\(tenantName) | \(tenantAddress)")
                                    .font(.system(size: 13))
                                    .foregroundColor(theme.colors.primaryText.color.opacity(0.9))
                                    .multilineTextAlignment(.center)
                            }
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
            }

            // Floating Refresh Button (token: components.showRefreshButton)
            if theme.components.showRefreshButton {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button(action: {
                            let generator = UIImpactFeedbackGenerator(style: .medium)
                            generator.impactOccurred()
                            print("[DisplayView] Manual refresh triggered")
                            apiService?.fetchEvents()
                        }) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 24))
                                .foregroundColor(.white.opacity(0.8))
                                .padding(12)
                                .background(Color.black.opacity(0.3))
                                .clipShape(Circle())
                        }
                        .padding(.trailing, 24)
                        .padding(.bottom, 24)
                    }
                }
            }
        }
        .environment(\.displayTheme, theme)
        .onAppear {
            // Skip all networking when rendering from injected fixtures.
            if isInjected { return }
            print("[DisplayView] onAppear triggered. Config present: \(configService.config != nil)")
            if let config = configService.config {
                // Initialize services with configuration
                let service = APIService(config: config)
                let sse = EventSourceService(config: config)
                
                self.apiService = service
                self.eventSource = sse
                
                // Fetch initial data
                service.refresh()
                
                // Connect to SSE for real-time updates
                sse.connect { eventType in
                    print("[SSE] Received: \(eventType)")
                    service.fetchEvents()
                }
            }
        }
        .onDisappear {
            // Clean up SSE connection
            eventSource?.disconnect()
        }
        .onReceive(timer) { _ in
            currentTime = Date()
            checkConnectionAndPoll()
        }
    }
    
    private func getCurrentEvent() -> Event? {
        resolvedEvents.first { event in
            guard let start = event.displayStart, let end = event.displayEnd else { return false }
            return effectiveNow >= start && effectiveNow <= end
        }
    }
    
    private func isDeviceOnline() -> Bool {
        if eventSource?.isConnected == true { return true }
        if let lastFetch = apiService?.lastSuccessfulFetch {
            // Consider online if we successfully fetched in the last 60 seconds
            return Date().timeIntervalSince(lastFetch) < 60
        }
        return false
    }
    
    private func checkConnectionAndPoll() {
        // If SSE is disconnected, poll manually every 30 seconds
        guard let sse = eventSource, !sse.isConnected else { return }
        
        // Don't poll if we are already loading
        if apiService?.isLoading == true { return }
        
        let lastFetch = apiService?.lastSuccessfulFetch ?? Date.distantPast
        if Date().timeIntervalSince(lastFetch) > 30 {
            print("[DisplayView] SSE Disconnected. Triggering fallback poll.")
            apiService?.fetchEvents()
        }
    }
    
    private func getUpcomingEvents() -> [Event] {
        resolvedEvents.filter { event in
            guard let start = event.displayStart else { return false }
            return start > effectiveNow
        }
    }

    private func getPastEvents() -> [Event] {
        resolvedEvents.filter { event in
            guard let end = event.displayEnd else { return false }
            return end < effectiveNow
        }
    }
}

struct HeaderView: View {
    let roomName: String
    let buildingName: String
    let currentTime: Date
    let isOnline: Bool
    @Environment(\.displayTheme) private var theme

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                if theme.header.showRoomName {
                    // header.title overrides the room name when set (null ⇒ room name).
                    Text(theme.header.title ?? roomName)
                        .font(.system(size: theme.typography.sized(theme.typography.headingSize), weight: .bold))
                        .foregroundColor(theme.colors.primaryText.color)
                }

                if theme.header.showBuildingName {
                    Text(buildingName)
                        .font(.system(size: theme.typography.sized(theme.typography.subheadingSize)))
                        .foregroundColor(theme.colors.secondaryText.color)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                if theme.header.showClock {
                    Text(currentTime, style: .time)
                        .font(.system(size: theme.typography.sized(theme.typography.clockSize), weight: .bold))
                        .foregroundColor(theme.colors.primaryText.color)
                }

                if theme.header.showDate {
                    Text(currentTime, format: .dateTime.weekday(.wide).month(.wide).day().year())
                        .font(.system(size: theme.typography.sized(theme.typography.dateSize)))
                        .foregroundColor(theme.colors.secondaryText.color)
                }

                if theme.header.showOnlineStatus {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(isOnline ? theme.colors.onlineColor.color : theme.colors.offlineColor.color)
                            .frame(width: 8, height: 8)
                        Text(isOnline ? "Online" : "Offline")
                            .font(.system(size: 10))
                            .foregroundColor(isOnline ? theme.colors.onlineColor.color : theme.colors.offlineColor.color)
                    }
                }
            }
        }
    }
}
