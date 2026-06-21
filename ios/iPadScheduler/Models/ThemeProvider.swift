import SwiftUI
import Combine

/// Holds the active display theme for the agenda screen. Injected as an
/// `@EnvironmentObject` so the view tree reads tokens from one place. Populated
/// from the room's server-resolved theme; falls back to `system_default`.
///
/// Added in the injectability step (non-visual). It is consumed by the views in
/// the token-swap step — until then the views still render literals, so wiring
/// this in does not change the rendered output.
final class ThemeProvider: ObservableObject {
    @Published var theme: ThemeDefinition

    init(theme: ThemeDefinition = .systemDefault) {
        self.theme = theme
    }

    /// Update from a room payload, applying the layout fallback.
    func update(from room: Room?) {
        theme = DisplayLayout.resolve(room?.resolvedTheme?.definition)
    }
}

/// Layout-archetype resolution. v1 supports only `agenda_list`; an unknown or
/// unsupported `layout` (e.g. a future archetype this build predates) falls back
/// to `system_default` so a display never breaks.
enum DisplayLayout {
    static func resolve(_ theme: ThemeDefinition?) -> ThemeDefinition {
        guard let theme, theme.isLayoutSupported else { return .systemDefault }
        return theme
    }
}

// MARK: - Environment propagation

/// SwiftUI analog of Android's `LocalDisplayTheme` CompositionLocal: the active
/// display theme flows down the view tree as an `@Environment` value whose
/// default is `system_default`. Reading it never crashes (unlike
/// `@EnvironmentObject`), so isolated views and snapshot hosts that inject
/// nothing render `system_default` — by design 8-bit-identical to the old
/// literals, which is what the parity gate checks.
private struct DisplayThemeKey: EnvironmentKey {
    static let defaultValue: ThemeDefinition = .systemDefault
}

extension EnvironmentValues {
    var displayTheme: ThemeDefinition {
        get { self[DisplayThemeKey.self] }
        set { self[DisplayThemeKey.self] = newValue }
    }
}
