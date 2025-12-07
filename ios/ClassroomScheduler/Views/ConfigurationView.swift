import SwiftUI

struct ConfigurationView: View {
    @EnvironmentObject var configService: ConfigurationService
    @State private var pairingToken: String = ""
    @State private var roomId: String = ""
    @State private var tenantId: String = ""
    @State private var apiBaseURL: String = "https://ipad-scheduler.com"
    @State private var isPairing: Bool = false
    @State private var errorMessage: String?
    @State private var activeTab: Int = 0 
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.07, green: 0.09, blue: 0.13),
                        Color(red: 0.11, green: 0.13, blue: 0.16)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Text("Device Setup")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
                
                Picker("Setup Mode", selection: $activeTab) {
                    Text("Pairing Token").tag(0)
                    Text("Manual Config").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal, 32)
                
                if activeTab == 0 {
                    // Pairing Mode
                    VStack(spacing: 16) {
                        Text("Enter the pairing token displayed in the admin dashboard.")
                            .font(.system(size: 14))
                            .foregroundColor(Color(white: 0.6))
                            .multilineTextAlignment(.center)
                        
                        // API Base URL is hidden/hardcoded for simplicity
                        
                        TextField("Pairing Token", text: $pairingToken)
                            .textFieldStyle(CustomTextFieldStyle())
                            .autocapitalization(.allCharacters)
                            .onChange(of: pairingToken) { newValue in
                                // Smart cleanup: If user pasted a full URL, just extract the code
                                if newValue.lowercased().hasPrefix("http") {
                                    if let url = URL(string: newValue) {
                                        let code = url.lastPathComponent
                                        if !code.isEmpty && code != "/" {
                                            pairingToken = code
                                        }
                                    }
                                }
                            }
                        
                        if let error = errorMessage {
                            Text(error)
                                .foregroundColor(.red)
                                .font(.system(size: 12))
                        }
                        
                        Button(action: pairDevice) {
                            HStack {
                                if isPairing {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Pair Device")
                                }
                            }
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .disabled(pairingToken.isEmpty || isPairing)
                    }
                    .padding(.horizontal, 32)
                } else {
                    // Manual Mode
                    VStack(spacing: 16) {
                        TextField("Room ID", text: $roomId)
                            .textFieldStyle(CustomTextFieldStyle())
                            .keyboardType(.numberPad)
                        
                        TextField("Tenant ID", text: $tenantId)
                            .textFieldStyle(CustomTextFieldStyle())
                            .keyboardType(.numberPad)
                        
                        TextField("API Base URL", text: $apiBaseURL)
                            .textFieldStyle(CustomTextFieldStyle())
                            .keyboardType(.URL)
                            .autocapitalization(.none)
                        
                        Button(action: saveManualConfiguration) {
                            Text("Save Configuration")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                        }
                        .disabled(roomId.isEmpty || tenantId.isEmpty || apiBaseURL.isEmpty)
                    }
                    .padding(.horizontal, 32)
                }
            }
            .padding()
        }
    }
    
    private func pairDevice() {
        isPairing = true
        errorMessage = nil
        
        // Smart cleanup: If user pasted a full URL, just extract the code
        let cleanToken: String
        if pairingToken.contains("http") || pairingToken.contains("/") {
            cleanToken = pairingToken.split(separator: "/").last.map(String.init) ?? pairingToken
        } else {
            cleanToken = pairingToken
        }
        
        configService.validatePairingToken(cleanToken, apiBaseURL: apiBaseURL) { result in
            DispatchQueue.main.async {
                isPairing = false
                switch result {
                case .success(let config):
                    configService.saveConfiguration(config)
                case .failure(let error):
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func saveManualConfiguration() {
        guard let roomIdInt = Int(roomId),
              let tenantIdInt = Int(tenantId) else {
            return
        }
        
        let config = AppConfig(
            roomId: roomIdInt,
            tenantId: tenantIdInt,
            apiBaseURL: apiBaseURL,
            deviceId: nil
        )
        
        configService.saveConfiguration(config)
    }
}

struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color(white: 0.15))
            .cornerRadius(8)
            .foregroundColor(.white)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(white: 0.3), lineWidth: 1)
            )
    }
}
