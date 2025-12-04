import Foundation
import Combine

class APIService: ObservableObject {
    private let config: AppConfig
    private var cancellables = Set<AnyCancellable>()
    
    @Published var room: Room?
    @Published var events: [Event] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    
    init(config: AppConfig) {
        self.config = config
    }
    
    func fetchRoom() {
        isLoading = true
        error = nil
        
        let urlString = "\(config.apiBaseURL)/api/rooms?tenant_id=\(config.tenantId)"
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
        isLoading = true
        error = nil
        
        let calendar = Calendar.current
        let today = Date()
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: today))!
        let endOfMonth = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth)!
        
        let dateFormatter = ISO8601DateFormatter()
        let startDate = dateFormatter.string(from: startOfMonth)
        let endDate = dateFormatter.string(from: endOfMonth)
        
        let urlString = "\(config.apiBaseURL)/api/events?room_id=\(config.roomId)&start_date=\(startDate)&end_date=\(endDate)&tenant_id=\(config.tenantId)"
        guard let url = URL(string: urlString) else {
            error = "Invalid URL"
            isLoading = false
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: [Event].self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = "Failed to fetch events: \(error.localizedDescription)"
                }
            } receiveValue: { [weak self] events in
                self?.events = events.filter { $0.occursToday() }
                    .sorted { ($0.displayStart ?? Date()) < ($1.displayStart ?? Date()) }
            }
            .store(in: &cancellables)
    }
    
    func refresh() {
        fetchRoom()
        fetchEvents()
    }
}
