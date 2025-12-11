import SwiftUI

//jaw 12/08/2025 

struct DisplayView: View {
    @EnvironmentObject var configService: ConfigurationService
    @State private var apiService: APIService?
    @State private var eventSource: EventSourceService?
    @State private var currentTime = Date()
  // jaw  
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.06, blue: 0.20),
                        Color(red: 0.08, green: 0.12, blue: 0.28),
                        Color(red: 0.05, green: 0.06, blue: 0.20)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    Rectangle()
                        .fill(Color.white)
                        .frame(height: 1)
                    
                    HeaderView(
                        roomName: apiService?.room?.name ?? "Loading...",
                        buildingName: apiService?.room?.buildingName ?? "",
                        currentTime: currentTime,
                        isOnline: isDeviceOnline()
                    )
                    
                    Rectangle()
                        .fill(Color.white)
                        .frame(height: 1)
                }
                .padding(.horizontal, 32)
                .padding(.top, 32)
                .padding(.bottom, 24)
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Current Event
                        if let currentEvent = getCurrentEvent() {
                            CurrentEventView(event: currentEvent)
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
                        
                        // Past Events
                        let past = getPastEvents()
                        if !past.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(past) { event in
                                    EventCardView(event: event, isPast: true)
                                        .padding(.horizontal, 32)
                                }
                            }
                        }
                        
                        // No events message
                        // No events message or Logo
                        if (apiService?.events.isEmpty ?? true) && !(apiService?.isLoading ?? false) {
                            if let logoStats = apiService?.room?.tenantLogoUrl,
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
                if let room = apiService?.room,
                   let tenantName = room.tenantName,
                   let tenantAddress = room.tenantAddress {
                    VStack(spacing: 12) {
                        Rectangle()
                            .fill(Color.white)
                            .frame(height: 1)
                            .opacity(0.5) 
                        
                        Text("\(tenantName) | \(tenantAddress)")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.9))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
            }
        }
        .onAppear {
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
        apiService?.events.first { event in
            guard let start = event.displayStart, let end = event.displayEnd else { return false }
            return currentTime >= start && currentTime <= end
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
        apiService?.events.filter { event in
            guard let start = event.displayStart else { return false }
            return start > currentTime
        } ?? []
    }
    
    private func getPastEvents() -> [Event] {
        apiService?.events.filter { event in
            guard let end = event.displayEnd else { return false }
            return end < currentTime
        } ?? []
    }
}

struct HeaderView: View {
    let roomName: String
    let buildingName: String
    let currentTime: Date
    let isOnline: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                Text(roomName)
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
                
                Text(buildingName)
                    .font(.system(size: 14))
                    .foregroundColor(Color(white: 0.6))
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(currentTime, style: .time)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                
                Text(currentTime, format: .dateTime.weekday(.wide).month(.wide).day())
                    .font(.system(size: 13))
                    .foregroundColor(Color(white: 0.6))
                
                HStack(spacing: 4) {
                    Circle()
                        .fill(isOnline ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(isOnline ? "Online" : "Offline")
                        .font(.system(size: 10))
                        .foregroundColor(isOnline ? Color.green : Color.red)
                }
            }
        }
    }
}
