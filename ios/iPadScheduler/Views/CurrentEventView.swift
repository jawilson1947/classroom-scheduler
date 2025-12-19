import SwiftUI
import WebKit
//jaw 12/19/2025 
struct CurrentEventView: View {
    let event: Event
    @State private var isAnimating = false
    @State private var showNarrative = false
    
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
                        showNarrative = true
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
                    Text(facilitator)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.9))
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
        .sheet(isPresented: $showNarrative) {
            if let narrative = event.narrative {
                NarrativeSheetView(
                    title: event.title,
                    htmlContent: narrative,
                    isPresented: $showNarrative
                )
            }
        }
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
        // Robust check: Parse HTML to plain text to handle <p> tags and entities
        var isURL = false
        if let data = html.data(using: .utf8) {
            if let attributedString = try? NSAttributedString(
                data: data,
                options: [.documentType: NSAttributedString.DocumentType.html, .characterEncoding: String.Encoding.utf8.rawValue],
                documentAttributes: nil
            ) {
                let text = attributedString.string.trimmingCharacters(in: .whitespacesAndNewlines)
                // Check just the first line of the text content
                let firstLine = text.components(separatedBy: .newlines).first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                
                if firstLine.lowercased().hasPrefix("http"), let url = URL(string: firstLine) {
                    let request = URLRequest(url: url)
                    uiView.load(request)
                    isURL = true
                }
            }
        }
        
        if !isURL {
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
