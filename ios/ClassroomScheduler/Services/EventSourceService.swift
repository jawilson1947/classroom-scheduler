import Foundation
import Combine

class EventSourceService: ObservableObject {
    private let config: AppConfig
    private var task: URLSessionDataTask?
    private var onEventReceived: ((String) -> Void)?
    
    @Published var isConnected: Bool = false
    
    init(config: AppConfig) {
        self.config = config
    }
    
    func connect(onEventReceived: @escaping (String) -> Void) {
        self.onEventReceived = onEventReceived
        
        let urlString = "\(config.apiBaseURL)/api/events/stream"
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = .infinity
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        
        let session = URLSession(configuration: .default, delegate: nil, delegateQueue: nil)
        
        task = session.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("[SSE] Connection error: \(error)")
                DispatchQueue.main.async {
                    self.isConnected = false
                }
                return
            }
            
            if let data = data, let message = String(data: data, encoding: .utf8) {
                DispatchQueue.main.async {
                    self.isConnected = true
                    self.handleMessage(message)
                }
            }
        }
        
        task?.resume()
    }
    
    func disconnect() {
        task?.cancel()
        task = nil
        isConnected = false
    }
    
    private func handleMessage(_ message: String) {
        // Parse SSE message format: "data: {...}\n\n"
        let lines = message.components(separatedBy: "\n")
        for line in lines {
            if line.hasPrefix("data: ") {
                let jsonString = String(line.dropFirst(6))
                if let data = jsonString.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let type = json["type"] as? String {
                    
                    if ["event_created", "event_updated", "event_deleted"].contains(type) {
                        onEventReceived?(type)
                    }
                }
            }
        }
    }
}
