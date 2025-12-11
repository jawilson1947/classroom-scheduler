import Foundation
import Combine

//jaw 12/8/2025

class APIService: ObservableObject {
    private let config: AppConfig
    private var cancellables = Set<AnyCancellable>()
    
    @Published var room: Room?
    @Published var events: [Event] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var lastSuccessfulFetch: Date?
    
    init(config: AppConfig) {
        self.config = config
    }
    
    func fetchRoom() {
        isLoading = true
        error = nil
        
        // Include both id and tenant_id for compatibility with both new and old API versions.
        // Old API ignores 'id' and needs 'tenant_id'. New API uses 'id' for precision.
        let urlString = "\(config.apiBaseURL)/api/rooms?id=\(config.roomId)&tenant_id=\(config.tenantId)"
        guard let url = URL(string: urlString) else {
            error = "Invalid URL"
            isLoading = false
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: [Room].self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = "Failed to fetch room: \(error.localizedDescription)"
                }
            } receiveValue: { [weak self] rooms in
                guard let self = self else { return }
                self.room = rooms.first(where: { $0.id == self.config.roomId })
            }
            .store(in: &cancellables)
    }
    
    func fetchEvents() {
        print("[APIService] fetchEvents called")
        isLoading = true
        error = nil
        
        let calendar = Calendar.current
        let today = Date()
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: today))!
        let endOfMonth = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth)!
        
        let dateFormatter = ISO8601DateFormatter()
        let startDate = dateFormatter.string(from: startOfMonth)
        let endDate = dateFormatter.string(from: endOfMonth)
        
        var urlString = "\(config.apiBaseURL)/api/events?room_id=\(config.roomId)&start_date=\(startDate)&end_date=\(endDate)&tenant_id=\(config.tenantId)"
        if let deviceId = config.deviceId {
            urlString += "&device_id=\(deviceId)"
        }
        guard let url = URL(string: urlString) else {
            error = "Invalid URL"
            isLoading = false
            return
        }
        
        print("[APIService] Fetching events from: \(urlString)")
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map { (data, response) -> Data in
                if let httpResponse = response as? HTTPURLResponse {
                    print("[APIService] Events API status: \(httpResponse.statusCode)")
                }
                // Debug print raw JSON
                if let jsonStr = String(data: data, encoding: .utf8) {
                    print("[APIService] Raw events JSON: \(jsonStr)")
                }
                return data
            }
            .decode(type: [Event].self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    print("[APIService] Failed to fetch/decode events: \(error)")
                    self?.error = "Failed to fetch events: \(error.localizedDescription)"
                }
            } receiveValue: { [weak self] events in
                print("[APIService] Successfully decoded \(events.count) events")
                self?.lastSuccessfulFetch = Date()
                self?.events = events.filter { $0.occursToday() }
                    .sorted { ($0.displayStart ?? Date()) < ($1.displayStart ?? Date()) }
                print("[APIService] Filtered to \(self?.events.count ?? 0) events for today")
            }
            .store(in: &cancellables)
    }
    
    func refresh() {
        fetchRoom()
        fetchEvents()
    }
}
