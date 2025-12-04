import SwiftUI

struct EventCardView: View {
    let event: Event
    let isPast: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(event.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(isPast ? Color.green.opacity(0.9) : .white)
                    .italic(isPast)
                
                if let facilitator = event.facilitatorName {
                    Text(facilitator)
                        .font(.system(size: 11))
                        .foregroundColor(isPast ? Color.green.opacity(0.7) : Color(white: 0.6))
                        .italic(isPast)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                if let start = event.displayStart {
                    Text(start, style: .time)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(isPast ? Color.green.opacity(0.9) : .white)
                        .italic(isPast)
                }
                
                if let end = event.displayEnd {
                    Text(end, style: .time)
                        .font(.system(size: 10))
                        .foregroundColor(isPast ? Color.green.opacity(0.7) : Color(white: 0.6))
                        .italic(isPast)
                }
            }
        }
        .padding(16)
        .background(
            Color(white: isPast ? 0.15 : 0.12)
                .opacity(isPast ? 0.5 : 1)
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(white: 0.25), lineWidth: 1)
        )
    }
}
