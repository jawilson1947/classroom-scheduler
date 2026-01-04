import SwiftUI
   // jaw 12/08/2025 
struct EventCardView: View {
    let event: Event
    let isPast: Bool
    @State private var showNarrative = false
    @State private var showFacilitator = false

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                if let narrative = event.narrative, !narrative.isEmpty {
                    Button(action: {
                        showNarrative = true
                    }) {
                        Text(event.title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(isPast ? Color.green.opacity(0.9) : .white)
                            .italic(isPast)
                            .underline()
                    }
                    .buttonStyle(.plain)
                } else {
                    Text(event.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(isPast ? Color.green.opacity(0.9) : .white)
                        .italic(isPast)
                }
                
                if let facilitator = event.facilitatorName {
                    HStack(alignment: .center, spacing: 6) {
                        Text(facilitator)
                            .font(.system(size: 11))
                            .foregroundColor(isPast ? Color.green.opacity(0.7) : Color(white: 0.6))
                            .italic(isPast)
                        
                        // Facilitator Icon
                        if event.facilitatorId != nil,
                           let iconString = event.facilitatorIconUrl {
                            
                            Button(action: {
                                showFacilitator = true
                            }) {
                                Group {
                                    if let url = URL(string: iconString),
                                       (iconString.hasPrefix("http") || iconString.hasPrefix("https")) {
                                        AsyncImage(url: url) { phase in
                                            switch phase {
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fit)
                                            default:
                                                Color.gray.opacity(0.3)
                                            }
                                        }
                                    } else {
                                        // Try Base64
                                        let cleanString = iconString.components(separatedBy: ",").last ?? iconString
                                        if let data = Data(base64Encoded: cleanString, options: .ignoreUnknownCharacters),
                                           let uiImage = UIImage(data: data) {
                                            Image(uiImage: uiImage)
                                                .resizable()
                                                .aspectRatio(contentMode: .fit)
                                        } else {
                                            Color.gray.opacity(0.3)
                                        }
                                    }
                                }
                                .frame(width: 20, height: 20)
                                .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
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
            Color(red: 0.08, green: 0.12, blue: 0.28)
            .opacity(isPast ? 0.5 : 1)
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
            .stroke(Color(white: 0.25), lineWidth: 1)
        )
        .sheet(isPresented: $showNarrative) {
            if let narrative = event.narrative {
                NarrativeSheetView(
                    title: event.title,
                    htmlContent: narrative,
                    isPresented: $showNarrative
                )
            }
        }
        .sheet(isPresented: $showFacilitator) {
            FacilitatorBioView(
                name: event.facilitatorName ?? "Facilitator",
                pictureUrl: event.facilitatorPictureUrl,
                bio: event.facilitatorBio,
                isPresented: $showFacilitator
            )
        }
    }
}
