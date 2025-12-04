import SwiftUI

struct CurrentEventView: View {
    let event: Event
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Current Event")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
                .textCase(.uppercase)
                .tracking(1)
            
            Text(event.title)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
            
            if let facilitator = event.facilitatorName {
                Text("Facilitator: \(facilitator)")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.9))
            }
            
            if let start = event.displayStart, let end = event.displayEnd {
                Text("\(start, style: .time) - \(end, style: .time)")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.9))
            }
            
            if let description = event.description {
                Text(description)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.8), Color.blue.opacity(0.7)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.3), radius: 10, y: 5)
    }
}
