import SwiftUI

struct DisplayView: View {
    @EnvironmentObject var configService: ConfigurationService
    @State private var apiService: APIService?
    @State private var eventSource: EventSourceService?
    @State private var currentTime = Date()
    
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(red: 0.07, green: 0.09, blue: 0.13),
                        Color(red: 0.11, green: 0.13, blue: 0.16),
                        Color(red: 0.07, green: 0.09, blue: 0.13)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                HeaderView(
                    roomName: apiService?.room?.name ?? "Loading...",
                    buildingName: apiService?.room?.buildingName ?? "",
                    currentTime: currentTime,
                    isOnline: eventSource?.isConnected ?? false
                )
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
                        if (apiService?.events.isEmpty ?? true) && !(apiService?.isLoading ?? false) {
                            Text("No events scheduled for today")
                                .font(.system(size: 16))
                                .foregroundColor(Color(white: 0.5))
                                .padding(.top, 24)
                        }
                    }
                    .padding(.bottom, 32)
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
        }
    }
    
    private func getCurrentEvent() -> Event? {
        apiService?.events.first { event in
            guard let start = event.displayStart, let end = event.displayEnd else { return false }
            return currentTime >= start && currentTime <= end
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
