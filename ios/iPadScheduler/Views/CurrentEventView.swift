import SwiftUI
import WebKit
//jaw 12/19/2025 
struct CurrentEventView: View {
    let event: Event
    @State private var isAnimating = false
    @State private var activeSheet: ActiveSheet?
    
    enum ActiveSheet: Identifiable {
        case narrative
        case facilitator
        
        var id: Int {
            hashValue
        }
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                // "NOW" Badge
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 6, height: 6)
                        .opacity(isAnimating ? 1 : 0.5)
                    Text("NOW")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.2))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                )
                
                if let narrative = event.narrative, !narrative.isEmpty {
                    Button(action: {
                        activeSheet = .narrative
                    }) {
                        Text(event.title)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .underline()
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 4)
                } else {
                    Text(event.title)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.top, 4)
                }
                
                if let facilitator = event.facilitatorName {
                    HStack(alignment: .center, spacing: 8) {
                        Text(facilitator)
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.9))
                        
                        // Facilitator Icon
                        if event.facilitatorId != nil, 
                           let iconString = event.facilitatorIconUrl {
                            
                            Button(action: {
                                print("[CurrentEventView] Facilitator icon tapped")
                                activeSheet = .facilitator
                            }) {
                                Group {
                                    if let url = URL(string: iconString), 
                                       (iconString.hasPrefix("http") || iconString.hasPrefix("https")) {
                                        AsyncImage(url: url) { phase in
                                            switch phase {
                                            case .empty:
                                                Color.white.opacity(0.3)
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                            case .failure:
                                                Color.gray.opacity(0.5)
                                            @unknown default:
                                                Color.gray
                                            }
                                        }
                                    } else {
                                        // Try Base64
                                        // Remove data:image/...;base64, prefix if present
                                        let cleanString = iconString.components(separatedBy: ",").last ?? iconString
                                        if let data = Data(base64Encoded: cleanString, options: .ignoreUnknownCharacters),
                                           let uiImage = UIImage(data: data) {
                                            Image(uiImage: uiImage)
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                        } else {
                                            Color.gray.opacity(0.5)
                                        }
                                    }
                                }
                                .frame(width: 8, height: 8)
                                .clipShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .frame(width: 44, height: 44) // Minimum hit area
                            .background(Color.white.opacity(0.001)) // Essential for hit testing transparent/empty areas
                            .contentShape(Rectangle()) // Ensures the entire 44x44 frame is tappable
                            .offset(x: -12) 
                        }
                    }
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                if let start = event.displayStart {
                    Text(start, style: .time)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                }
                
                if let end = event.displayEnd {
                    Text("ends " + end.formatted(date: .omitted, time: .shortened))
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
        .padding(20)
        .background(
            ZStack {
                // Vibrant Gradient Background
                LinearGradient(
                    colors: [
                        Color(red: 0.1, green: 0.2, blue: 0.8), // Royal Blue
                        Color(red: 0.4, green: 0.2, blue: 0.9)  // Electric Purple
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                // Subtle overlay pattern or sheen could go here
            }
        )
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.3), lineWidth: 1)
        )
        .shadow(color: Color.blue.opacity(0.3), radius: isAnimating ? 10 : 5, x: 0, y: 4)
        .scaleEffect(isAnimating ? 1.01 : 1.0)
        .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: isAnimating)
        .onAppear {
            isAnimating = true
        }
        .sheet(item: $activeSheet) { item in
            switch item {
            case .narrative:
                if let narrative = event.narrative {
                    NarrativeSheetView(
                        title: event.title,
                        htmlContent: narrative,
                        isPresented: Binding(
                            get: { activeSheet == .narrative },
                            set: { if !$0 { activeSheet = nil } }
                        )
                    )
                }
            case .facilitator:
                FacilitatorBioView(
                    name: event.facilitatorName ?? "Facilitator",
                    pictureUrl: event.facilitatorPictureUrl,
                    bio: event.facilitatorBio,
                    isPresented: Binding(
                        get: { activeSheet == .facilitator },
                        set: { if !$0 { activeSheet = nil } }
                    )
                )
            }
        }
    }
}

struct FacilitatorBioView: View {
    let name: String
    let pictureUrl: String?
    let bio: String?
    @Binding var isPresented: Bool
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Construct HTML content
                let htmlContent = generateHtml()
                WebView(html: htmlContent)
                    .edgesIgnoringSafeArea(.bottom)
            }
            .navigationTitle(name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        isPresented = false
                    }) {
                        Text("Close")
                            .font(.headline)
                    }
                }
            }
        }
    }
    
    private func generateHtml() -> String {
        var html = ""
        
        // Add styles for flowing text around image
        html += """
        <style>
            .container {
                font-family: -apple-system, system-ui;
                font-size: 1.2rem;
                line-height: 1.6;
                color: #333;
                padding: 1rem;
            }
            .facilitator-img {
                float: left;
                margin-right: 20px;
                margin-bottom: 20px;
                width: 150px;
                height: auto;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            p { margin-bottom: 1rem; }
        </style>
        <div class="container">
        """
        
        if let picUrl = pictureUrl, !picUrl.isEmpty {
            html += "<img src=\"\(picUrl)\" class=\"facilitator-img\" alt=\"\(name)\" />"
        }
        
        if let bioContent = bio, !bioContent.isEmpty {
            html += bioContent
        } else {
            html += "<p>No biography available.</p>"
        }
        
        html += "</div>"
        return html
    }
}

struct NarrativeSheetView: View {
    let title: String
    let htmlContent: String
    @Binding var isPresented: Bool
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                WebView(html: htmlContent)
                    .edgesIgnoringSafeArea(.bottom)
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        isPresented = false
                    }) {
                        Text("Close")
                            .font(.headline)
                    }
                }
            }
        }
    }
}

// WKWebView Wrapper
struct WebView: UIViewRepresentable {
    let html: String
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.showsVerticalScrollIndicator = true
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Simple robust check to determine if the string is a URL or HTML content
        // interacting with NSAttributedString(data: ... .html) can cause main thread issues and crashes
        // when used inside updateUIView due to internal WebKit usage.
        
        let trimmed = html.trimmingCharacters(in: .whitespacesAndNewlines)
        var isURL = false
        
        // If it looks like a URL and doesn't contain HTML tags
        if (trimmed.lowercased().hasPrefix("http://") || trimmed.lowercased().hasPrefix("https://")) && !trimmed.contains("<") {
            if let url = URL(string: trimmed) {
                let request = URLRequest(url: url)
                uiView.load(request)
                isURL = true
            }
        }
        
        if !isURL {
            if html.contains("<style>") {
                 uiView.loadHTMLString(html, baseURL: nil)
            } else {
                 let css = """
                 <style>
                     body { 
                         font-family: -apple-system, system-ui; 
                         font-size: 1.2rem; 
                         line-height: 1.5; 
                         color: #333; 
                         padding: 1rem; 
                     }
                     ul, ol { padding-left: 20px; }
                 </style>
                 """
                 uiView.loadHTMLString(css + html, baseURL: nil)
            }
        }
    }
}
