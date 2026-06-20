import SwiftUI
   // jaw 12/08/2025 
struct EventCardView: View {
    let event: Event
    let isPast: Bool
    @State private var showNarrative = false
    @State private var showFacilitator = false
    @Environment(\.displayTheme) private var theme

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                if let narrative = event.narrative, !narrative.isEmpty {
                    Button(action: {
                        showNarrative = true
                    }) {
                        Text(event.title)
                            .font(.system(size: theme.typography.sized(theme.typography.eventTitleSize), weight: .semibold))
                            .foregroundColor(isPast ? theme.colors.pastEventText.color.opacity(0.9) : theme.colors.primaryText.color)
                            .italic(isPast)
                            .underline()
                    }
                    .buttonStyle(.plain)
                } else {
                    Text(event.title)
                        .font(.system(size: theme.typography.sized(theme.typography.eventTitleSize), weight: .semibold))
                        .foregroundColor(isPast ? theme.colors.pastEventText.color.opacity(0.9) : theme.colors.primaryText.color)
                        .italic(isPast)
                }
                
                if theme.components.showFacilitator, let facilitator = event.facilitatorName {
                    HStack(alignment: .center, spacing: 6) {
                        Text(facilitator)
                            .font(.system(size: theme.typography.sized(theme.typography.facilitatorSize)))
                            .foregroundColor(isPast ? theme.colors.pastEventText.color.opacity(0.7) : theme.colors.secondaryText.color)
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
                    .font(.system(size: theme.typography.sized(theme.typography.eventTimeSize), weight: .medium))
                    .foregroundColor(isPast ? theme.colors.pastEventText.color.opacity(0.9) : theme.colors.primaryText.color)
                    .italic(isPast)
                }

                if let end = event.displayEnd {
                    Text(end, style: .time)
                    .font(.system(size: theme.typography.sized(theme.typography.eventEndTimeSize)))
                    .foregroundColor(isPast ? theme.colors.pastEventText.color.opacity(0.7) : theme.colors.secondaryText.color)
                    .italic(isPast)
                }
            }
        }
        .padding(16)
        .background(
            theme.colors.panel.color
            .opacity(isPast ? theme.colors.panelOpacityPast : 1)
        )
        .cornerRadius(CGFloat(theme.components.cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: CGFloat(theme.components.cornerRadius))
            .stroke(theme.colors.panelBorder.color, lineWidth: 1)
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
