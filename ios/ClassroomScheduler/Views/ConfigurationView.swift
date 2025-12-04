import SwiftUI

struct ConfigurationView: View {
    @EnvironmentObject var configService: ConfigurationService
    @State private var roomId: String = ""
    @State private var tenantId: String = ""
    @State private var apiBaseURL: String = "https://"
    
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
                
                Text("This device is not configured.\nPlease enter configuration details or deploy via MDM.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(white: 0.6))
                    .multilineTextAlignment(.center)
                
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
                }
                .padding(.horizontal, 32)
                
                Button(action: saveConfiguration) {
                    Text("Save Configuration")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 32)
                .disabled(roomId.isEmpty || tenantId.isEmpty || apiBaseURL.isEmpty)
            }
            .padding()
        }
    }
    
    private func saveConfiguration() {
        guard let roomIdInt = Int(roomId),
              let tenantIdInt = Int(tenantId) else {
            return
        }
        
        let config = AppConfig(
            roomId: roomIdInt,
            tenantId: tenantIdInt,
            apiBaseURL: apiBaseURL
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
