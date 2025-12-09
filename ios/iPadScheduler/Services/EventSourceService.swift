import Foundation
import Combine

//jaw 12/8/2025

class EventSourceService: NSObject, ObservableObject, URLSessionDataDelegate {
    private let config: AppConfig
    private var session: URLSession?
    private var task: URLSessionDataTask?
    private var onEventReceived: ((String) -> Void)?
    private var buffer = Data()
    
    @Published var isConnected: Bool = false
    
    init(config: AppConfig) {
        self.config = config
        super.init()
    }
    
    func connect(onEventReceived: @escaping (String) -> Void) {
        self.onEventReceived = onEventReceived
        
        var urlString = "\(config.apiBaseURL)/api/events/stream"
        if let deviceId = config.deviceId {
            urlString += "?device_id=\(deviceId)"
        }
        guard let url = URL(string: urlString) else {
            print("[SSE] Invalid URL: \(urlString)")
            return
        }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = .infinity
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = .infinity
        configuration.timeoutIntervalForResource = .infinity
        
        session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        task = session?.dataTask(with: request)
        
        print("[SSE] Connecting to: \(urlString)")
        task?.resume()
    }
    
    func disconnect() {
        print("[SSE] Disconnecting")
        task?.cancel()
        task = nil
        session?.invalidateAndCancel()
        session = nil
        buffer.removeAll()
        DispatchQueue.main.async {
            self.isConnected = false
        }
    }
    
    // MARK: - URLSessionDataDelegate
    
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        print("[SSE] Connection established")
        DispatchQueue.main.async {
            self.isConnected = true
        }
        completionHandler(.allow)
    }
    
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        // Append incoming data to buffer
        buffer.append(data)
        
        // Process complete messages (ending with \n\n)
        while let range = buffer.range(of: Data("\n\n".utf8)) {
            let messageData = buffer.subdata(in: 0..<range.lowerBound)
            buffer.removeSubrange(0..<range.upperBound)
            
            if let message = String(data: messageData, encoding: .utf8) {
                DispatchQueue.main.async {
                    self.handleMessage(message)
                }
            }
        }
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            print("[SSE] Connection error: \(error.localizedDescription)")
        } else {
            print("[SSE] Connection closed cleanly by server or client")
        }
        
        // Log the reason we are disconnecting
        if let response = task.response as? HTTPURLResponse {
             print("[SSE] Last HTTP Status: \(response.statusCode)")
        }
        
        DispatchQueue.main.async {
            self.isConnected = false
        }
        
        // Attempt to reconnect after 5 seconds
        if error != nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                guard let self = self, let callback = self.onEventReceived else { return }
                print("[SSE] Attempting to reconnect...")
                self.connect(onEventReceived: callback)
            }
        }
    }
    
    private func handleMessage(_ message: String) {
        // Parse SSE message format: "data: {...}\n"
        let lines = message.components(separatedBy: "\n")
        for line in lines {
            if line.hasPrefix("data: ") {
                let jsonString = String(line.dropFirst(6))
                if let data = jsonString.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let type = json["type"] as? String {
                    
                    print("[SSE] Received event type: \(type)")
                    if ["event_created", "event_updated", "event_deleted"].contains(type) {
                        onEventReceived?(type)
                    }
                }
            }
        }
    }
}
