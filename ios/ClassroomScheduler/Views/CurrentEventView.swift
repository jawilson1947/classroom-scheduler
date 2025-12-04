import SwiftUI

struct CurrentEventView: View {
    let event: Event
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("In Progress...")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                    .italic()
                
                Text(event.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                
                if let facilitator = event.facilitatorName {
                    Text(facilitator)
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                if let start = event.displayStart {
                    Text(start, style: .time)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white)
                }
                
                if let end = event.displayEnd {
                    Text(end, style: .time)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.8), Color.blue.opacity(0.7)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(12)
    }
}
