import SwiftUI

// Display Theme model (Phase 2b).
//
// Mirrors docs/theme.schema.v1.json. Decoded from the `resolved_theme` object
// the server attaches to each /api/rooms row. Decoding is LENIENT by design:
// every field is optional and falls back to the documented default, and unknown
// keys are ignored. A nil/garbage theme or an unknown `layout` must fall back to
// `ThemeDefinition.systemDefault` at the view layer (see LayoutRouter).
//
// JSON keys are camelCase (schemaVersion, primaryText, showRoomName, ...), so the
// Swift property names match the keys directly — no CodingKeys needed except where
// noted. Numeric sizes are points at scale 1.0; `scale` multiplies them.

// MARK: - Top level

struct ThemeDefinition: Codable, Equatable {
    var schemaVersion: Int = 1
    var layout: String = "agenda_list"
    var colors: ThemeColors = .init()
    var typography: ThemeTypography = .init()
    var header: ThemeHeader = .init()
    var components: ThemeComponents = .init()
    var footer: ThemeFooter = .init()

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = (try? c.decode(Int.self, forKey: .schemaVersion)) ?? 1
        layout = (try? c.decode(String.self, forKey: .layout)) ?? "agenda_list"
        colors = (try? c.decode(ThemeColors.self, forKey: .colors)) ?? .init()
        typography = (try? c.decode(ThemeTypography.self, forKey: .typography)) ?? .init()
        header = (try? c.decode(ThemeHeader.self, forKey: .header)) ?? .init()
        components = (try? c.decode(ThemeComponents.self, forKey: .components)) ?? .init()
        footer = (try? c.decode(ThemeFooter.self, forKey: .footer)) ?? .init()
    }

    enum CodingKeys: String, CodingKey {
        case schemaVersion, layout, colors, typography, header, components, footer
    }

    /// Whether this client knows how to render the requested layout archetype.
    var isLayoutSupported: Bool { LayoutArchetype(rawValue: layout) != nil }

    /// Bundled fallback identical to docs/themes/system_default.json (D1: iOS values).
    static let systemDefault = ThemeDefinition()
}

/// Wrapper the server attaches as `resolved_theme` on each room. The actual token
/// spec lives under `definition`; the other fields are metadata. Decoding the
/// envelope (rather than a bare `ThemeDefinition`) is required — otherwise the
/// tokens are read one level too high and every field silently falls back to the
/// `system_default` defaults. All fields optional so a malformed/absent envelope
/// degrades gracefully to `system_default` instead of failing the room decode.
struct ResolvedThemeEnvelope: Codable, Equatable {
    let id: Int?
    let keyName: String?
    let name: String?
    let schemaVersion: Int?
    let definition: ThemeDefinition?

    enum CodingKeys: String, CodingKey {
        case id, name, definition
        case keyName = "key_name"
        case schemaVersion = "schema_version"
    }
}

/// Layout archetypes this client can render. v1 = agenda_list only.
enum LayoutArchetype: String {
    case agendaList = "agenda_list"
}

// MARK: - Colors

struct ThemeColors: Codable, Equatable {
    var background: Fill = .gradient([Hex("#0D0F33"), Hex("#141F47"), Hex("#0D0F33")],
                                     start: .topLeading, end: .bottomTrailing)
    var panel: Hex = "#141F47"
    var panelOpacityPast: Double = 0.5
    var panelBorder: Hex = "#404040"
    var headerAccentBar: Hex? = nil
    var tickerBar: Hex = "#16213E"
    var tickerText: Hex = "#FFFFFF"
    var primaryText: Hex = "#FFFFFF"
    var secondaryText: Hex = "#999999"
    var accent: Hex = "#FFFFFF"
    var currentEvent: Fill = .gradient([Hex("#1A33CC"), Hex("#6633E6")],
                                       start: .topLeading, end: .bottomTrailing)
    var currentEventText: Hex = "#FFFFFF"
    var currentEventBorder: Hex = "#FFFFFF4D"
    var pastEventText: Hex = "#34C759"
    var dividerColor: Hex = "#FFFFFF"
    var onlineColor: Hex = "#34C759"
    var offlineColor: Hex = "#FF3B30"

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = ThemeColors()
        background = (try? c.decode(Fill.self, forKey: .background)) ?? d.background
        panel = (try? c.decode(Hex.self, forKey: .panel)) ?? d.panel
        panelOpacityPast = (try? c.decode(Double.self, forKey: .panelOpacityPast)) ?? d.panelOpacityPast
        panelBorder = (try? c.decode(Hex.self, forKey: .panelBorder)) ?? d.panelBorder
        headerAccentBar = (try? c.decode(Hex.self, forKey: .headerAccentBar)) ?? nil
        tickerBar = (try? c.decode(Hex.self, forKey: .tickerBar)) ?? d.tickerBar
        tickerText = (try? c.decode(Hex.self, forKey: .tickerText)) ?? d.tickerText
        primaryText = (try? c.decode(Hex.self, forKey: .primaryText)) ?? d.primaryText
        secondaryText = (try? c.decode(Hex.self, forKey: .secondaryText)) ?? d.secondaryText
        accent = (try? c.decode(Hex.self, forKey: .accent)) ?? d.accent
        currentEvent = (try? c.decode(Fill.self, forKey: .currentEvent)) ?? d.currentEvent
        currentEventText = (try? c.decode(Hex.self, forKey: .currentEventText)) ?? d.currentEventText
        currentEventBorder = (try? c.decode(Hex.self, forKey: .currentEventBorder)) ?? d.currentEventBorder
        pastEventText = (try? c.decode(Hex.self, forKey: .pastEventText)) ?? d.pastEventText
        dividerColor = (try? c.decode(Hex.self, forKey: .dividerColor)) ?? d.dividerColor
        onlineColor = (try? c.decode(Hex.self, forKey: .onlineColor)) ?? d.onlineColor
        offlineColor = (try? c.decode(Hex.self, forKey: .offlineColor)) ?? d.offlineColor
    }

    enum CodingKeys: String, CodingKey {
        case background, panel, panelOpacityPast, panelBorder, headerAccentBar, tickerBar,
             tickerText, primaryText, secondaryText, accent, currentEvent, currentEventText,
             currentEventBorder, pastEventText, dividerColor, onlineColor, offlineColor
    }
}

// MARK: - Typography

struct ThemeTypography: Codable, Equatable {
    var fontFamily: String = "system"
    var scale: Double = 1.0
    var headingSize: Double = 32
    var subheadingSize: Double = 14
    var clockSize: Double = 24
    var dateSize: Double = 13
    var eventTitleSize: Double = 14
    var eventTimeSize: Double = 13
    var eventEndTimeSize: Double = 10
    var currentTitleSize: Double = 18
    var currentTimeSize: Double = 16
    var facilitatorSize: Double = 11

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = ThemeTypography()
        fontFamily = (try? c.decode(String.self, forKey: .fontFamily)) ?? d.fontFamily
        scale = (try? c.decode(Double.self, forKey: .scale)) ?? d.scale
        headingSize = (try? c.decode(Double.self, forKey: .headingSize)) ?? d.headingSize
        subheadingSize = (try? c.decode(Double.self, forKey: .subheadingSize)) ?? d.subheadingSize
        clockSize = (try? c.decode(Double.self, forKey: .clockSize)) ?? d.clockSize
        dateSize = (try? c.decode(Double.self, forKey: .dateSize)) ?? d.dateSize
        eventTitleSize = (try? c.decode(Double.self, forKey: .eventTitleSize)) ?? d.eventTitleSize
        eventTimeSize = (try? c.decode(Double.self, forKey: .eventTimeSize)) ?? d.eventTimeSize
        eventEndTimeSize = (try? c.decode(Double.self, forKey: .eventEndTimeSize)) ?? d.eventEndTimeSize
        currentTitleSize = (try? c.decode(Double.self, forKey: .currentTitleSize)) ?? d.currentTitleSize
        currentTimeSize = (try? c.decode(Double.self, forKey: .currentTimeSize)) ?? d.currentTimeSize
        facilitatorSize = (try? c.decode(Double.self, forKey: .facilitatorSize)) ?? d.facilitatorSize
    }

    enum CodingKeys: String, CodingKey {
        case fontFamily, scale, headingSize, subheadingSize, clockSize, dateSize,
             eventTitleSize, eventTimeSize, eventEndTimeSize, currentTitleSize,
             currentTimeSize, facilitatorSize
    }

    /// Size in points after applying `scale`.
    func sized(_ base: Double) -> CGFloat { CGFloat(base * scale) }
}

// MARK: - Header / Components / Footer

struct ThemeHeader: Codable, Equatable {
    var title: String? = nil
    var showRoomName: Bool = true
    var showBuildingName: Bool = true
    var showDate: Bool = true
    var showClock: Bool = true
    var showOnlineStatus: Bool = true
    var logoPosition: String = "none"
    var dividers: Bool = true

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = ThemeHeader()
        title = (try? c.decode(String.self, forKey: .title)) ?? nil
        showRoomName = (try? c.decode(Bool.self, forKey: .showRoomName)) ?? d.showRoomName
        showBuildingName = (try? c.decode(Bool.self, forKey: .showBuildingName)) ?? d.showBuildingName
        showDate = (try? c.decode(Bool.self, forKey: .showDate)) ?? d.showDate
        showClock = (try? c.decode(Bool.self, forKey: .showClock)) ?? d.showClock
        showOnlineStatus = (try? c.decode(Bool.self, forKey: .showOnlineStatus)) ?? d.showOnlineStatus
        logoPosition = (try? c.decode(String.self, forKey: .logoPosition)) ?? d.logoPosition
        dividers = (try? c.decode(Bool.self, forKey: .dividers)) ?? d.dividers
    }

    enum CodingKeys: String, CodingKey {
        case title, showRoomName, showBuildingName, showDate, showClock, showOnlineStatus, logoPosition, dividers
    }
}

struct ThemeComponents: Codable, Equatable {
    var eventRow: String = "title_left_time_right"
    var showCurrentEventHighlight: Bool = true
    var showFacilitator: Bool = true
    var showPastEvents: Bool = true
    var showTicker: Bool = false
    var tickerText: String? = nil
    var clockPosition: String = "header_right"
    var cornerRadius: Double = 12
    var showRefreshButton: Bool = true

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = ThemeComponents()
        eventRow = (try? c.decode(String.self, forKey: .eventRow)) ?? d.eventRow
        showCurrentEventHighlight = (try? c.decode(Bool.self, forKey: .showCurrentEventHighlight)) ?? d.showCurrentEventHighlight
        showFacilitator = (try? c.decode(Bool.self, forKey: .showFacilitator)) ?? d.showFacilitator
        showPastEvents = (try? c.decode(Bool.self, forKey: .showPastEvents)) ?? d.showPastEvents
        showTicker = (try? c.decode(Bool.self, forKey: .showTicker)) ?? d.showTicker
        tickerText = (try? c.decode(String.self, forKey: .tickerText)) ?? nil
        clockPosition = (try? c.decode(String.self, forKey: .clockPosition)) ?? d.clockPosition
        cornerRadius = (try? c.decode(Double.self, forKey: .cornerRadius)) ?? d.cornerRadius
        showRefreshButton = (try? c.decode(Bool.self, forKey: .showRefreshButton)) ?? d.showRefreshButton
    }

    enum CodingKeys: String, CodingKey {
        case eventRow, showCurrentEventHighlight, showFacilitator, showPastEvents,
             showTicker, tickerText, clockPosition, cornerRadius, showRefreshButton
    }

    /// D2: the NOW card uses the regular radius + 4 (preserves today's 12 -> 16).
    var currentCornerRadius: Double { cornerRadius + 4 }
}

struct ThemeFooter: Codable, Equatable {
    var show: Bool = true
    var showVersion: Bool = true
    var showTenantInfo: Bool = true

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = ThemeFooter()
        show = (try? c.decode(Bool.self, forKey: .show)) ?? d.show
        showVersion = (try? c.decode(Bool.self, forKey: .showVersion)) ?? d.showVersion
        showTenantInfo = (try? c.decode(Bool.self, forKey: .showTenantInfo)) ?? d.showTenantInfo
    }

    enum CodingKeys: String, CodingKey { case show, showVersion, showTenantInfo }
}

// MARK: - Hex color

/// A hex color string (#RRGGBB or #RRGGBBAA) with a SwiftUI `Color` accessor.
/// Decodes from a plain JSON string; encodes back to that string.
struct Hex: Codable, Equatable, ExpressibleByStringLiteral {
    let raw: String
    init(_ raw: String) { self.raw = raw }
    init(stringLiteral value: String) { self.raw = value }
    init(from decoder: Decoder) throws { raw = try decoder.singleValueContainer().decode(String.self) }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer(); try c.encode(raw)
    }

    /// Parsed color; falls back to `.clear` only if the string is unparseable.
    var color: Color {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard let v = UInt64(s, radix: 16) else { return .clear }
        let r, g, b, a: Double
        switch s.count {
        case 6:
            r = Double((v & 0xFF0000) >> 16) / 255
            g = Double((v & 0x00FF00) >> 8) / 255
            b = Double(v & 0x0000FF) / 255
            a = 1
        case 8:
            r = Double((v & 0xFF000000) >> 24) / 255
            g = Double((v & 0x00FF0000) >> 16) / 255
            b = Double((v & 0x0000FF00) >> 8) / 255
            a = Double(v & 0x000000FF) / 255
        default:
            return .clear
        }
        return Color(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

// MARK: - Fill (solid | gradient | image_blur)

/// A background/foreground fill. Decodes from either a hex string or an object
/// with a `type` discriminator, per the schema's `fill` definition.
enum Fill: Codable, Equatable {
    case solid(Hex)
    case gradient([Hex], start: GradientPoint, end: GradientPoint)
    case imageBlur(url: String?, blurRadius: Double, fallback: Hex)

    // Render helpers ---------------------------------------------------------

    /// A SwiftUI gradient/solid view suitable for a background. For image_blur,
    /// v1 (parity-only, D4) renders the solid `fallback`; the blurred image is a
    /// follow-up feature.
    @ViewBuilder var view: some View {
        switch self {
        case .solid(let hex):
            hex.color
        case .gradient(let stops, let start, let end):
            LinearGradient(colors: stops.map(\.color), startPoint: start.unitPoint, endPoint: end.unitPoint)
        case .imageBlur(_, _, let fallback):
            fallback.color
        }
    }

    // Decoding ---------------------------------------------------------------

    init(from decoder: Decoder) throws {
        // Try a bare hex string first.
        if let single = try? decoder.singleValueContainer(), let s = try? single.decode(String.self) {
            self = .solid(Hex(s)); return
        }
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let type = (try? c.decode(String.self, forKey: .type)) ?? "solid"
        switch type {
        case "gradient":
            let colors = (try? c.decode([Hex].self, forKey: .colors)) ?? [Hex("#000000"), Hex("#000000")]
            let start = GradientPoint(rawValue: (try? c.decode(String.self, forKey: .start)) ?? "topLeading") ?? .topLeading
            let end = GradientPoint(rawValue: (try? c.decode(String.self, forKey: .end)) ?? "bottomTrailing") ?? .bottomTrailing
            self = .gradient(colors, start: start, end: end)
        case "image_blur":
            let url = try? c.decode(String.self, forKey: .url)
            let blur = (try? c.decode(Double.self, forKey: .blurRadius)) ?? 20
            let fallback = (try? c.decode(Hex.self, forKey: .fallback)) ?? Hex("#000000")
            self = .imageBlur(url: url ?? nil, blurRadius: blur, fallback: fallback)
        default:
            let color = (try? c.decode(Hex.self, forKey: .color)) ?? Hex("#000000")
            self = .solid(color)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .solid(let hex):
            try c.encode("solid", forKey: .type); try c.encode(hex, forKey: .color)
        case .gradient(let colors, let start, let end):
            try c.encode("gradient", forKey: .type); try c.encode(colors, forKey: .colors)
            try c.encode(start.rawValue, forKey: .start); try c.encode(end.rawValue, forKey: .end)
        case .imageBlur(let url, let blur, let fallback):
            try c.encode("image_blur", forKey: .type); try c.encodeIfPresent(url, forKey: .url)
            try c.encode(blur, forKey: .blurRadius); try c.encode(fallback, forKey: .fallback)
        }
    }

    enum CodingKeys: String, CodingKey { case type, color, colors, start, end, url, blurRadius, fallback }
}

/// Gradient anchor points mapped to SwiftUI `UnitPoint`.
enum GradientPoint: String {
    case top, bottom, leading, trailing
    case topLeading, topTrailing, bottomLeading, bottomTrailing, center

    var unitPoint: UnitPoint {
        switch self {
        case .top: return .top
        case .bottom: return .bottom
        case .leading: return .leading
        case .trailing: return .trailing
        case .topLeading: return .topLeading
        case .topTrailing: return .topTrailing
        case .bottomLeading: return .bottomLeading
        case .bottomTrailing: return .bottomTrailing
        case .center: return .center
        }
    }
}
