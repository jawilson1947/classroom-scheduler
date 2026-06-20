package com.classroomscheduler.data.models

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.annotations.JsonAdapter
import com.google.gson.annotations.SerializedName
import java.lang.reflect.Type

/**
 * Display Theme model (Phase 2b) — mirror of iOS Models/Theme.swift and
 * docs/theme.schema.v1.json. Decoded from the `resolved_theme` object the server
 * attaches to each /api/rooms row.
 *
 * Lenient by design. Note the Gson+Kotlin gotcha: Gson instantiates via Unsafe and
 * bypasses constructors, so Kotlin default *parameter* values are NOT applied to
 * missing JSON keys. To get real defaults we store nullable backing fields
 * (`_name`, mapped with @SerializedName) and expose non-null getters that coalesce
 * to the default. Unknown keys are ignored by Gson automatically. A null/garbage
 * theme or unknown `layout` must fall back to ThemeDefinition.systemDefault() at the
 * view layer (see the layout router added in the view refactor step).
 *
 * JSON keys are camelCase, matching these field names.
 */
data class ThemeDefinition(
    @SerializedName("schemaVersion") private val _schemaVersion: Int? = null,
    @SerializedName("layout") private val _layout: String? = null,
    @SerializedName("colors") private val _colors: ThemeColors? = null,
    @SerializedName("typography") private val _typography: ThemeTypography? = null,
    @SerializedName("header") private val _header: ThemeHeader? = null,
    @SerializedName("components") private val _components: ThemeComponents? = null,
    @SerializedName("footer") private val _footer: ThemeFooter? = null,
) {
    val schemaVersion: Int get() = _schemaVersion ?: 1
    val layout: String get() = _layout ?: "agenda_list"
    val colors: ThemeColors get() = _colors ?: ThemeColors()
    val typography: ThemeTypography get() = _typography ?: ThemeTypography()
    val header: ThemeHeader get() = _header ?: ThemeHeader()
    val components: ThemeComponents get() = _components ?: ThemeComponents()
    val footer: ThemeFooter get() = _footer ?: ThemeFooter()

    /** Whether this client knows how to render the requested archetype. v1 = agenda_list. */
    val isLayoutSupported: Boolean get() = layout in SUPPORTED_LAYOUTS

    companion object {
        val SUPPORTED_LAYOUTS = setOf("agenda_list")
        /** Bundled fallback identical to docs/themes/system_default.json (D1: iOS values). */
        fun systemDefault(): ThemeDefinition = ThemeDefinition()
    }
}

data class ThemeColors(
    @SerializedName("background") private val _background: Fill? = null,
    @SerializedName("panel") private val _panel: String? = null,
    @SerializedName("panelOpacityPast") private val _panelOpacityPast: Float? = null,
    @SerializedName("panelBorder") private val _panelBorder: String? = null,
    @SerializedName("headerAccentBar") val headerAccentBar: String? = null,
    @SerializedName("tickerBar") private val _tickerBar: String? = null,
    @SerializedName("tickerText") private val _tickerText: String? = null,
    @SerializedName("primaryText") private val _primaryText: String? = null,
    @SerializedName("secondaryText") private val _secondaryText: String? = null,
    @SerializedName("accent") private val _accent: String? = null,
    @SerializedName("currentEvent") private val _currentEvent: Fill? = null,
    @SerializedName("currentEventText") private val _currentEventText: String? = null,
    @SerializedName("currentEventBorder") private val _currentEventBorder: String? = null,
    @SerializedName("pastEventText") private val _pastEventText: String? = null,
    @SerializedName("dividerColor") private val _dividerColor: String? = null,
    @SerializedName("onlineColor") private val _onlineColor: String? = null,
    @SerializedName("offlineColor") private val _offlineColor: String? = null,
) {
    val background: Fill get() = _background ?: Fill.Gradient(listOf("#0D0F33", "#141F47", "#0D0F33"))
    val panel: String get() = _panel ?: "#141F47"
    val panelOpacityPast: Float get() = _panelOpacityPast ?: 0.5f
    val panelBorder: String get() = _panelBorder ?: "#404040"
    val tickerBar: String get() = _tickerBar ?: "#16213E"
    val tickerText: String get() = _tickerText ?: "#FFFFFF"
    val primaryText: String get() = _primaryText ?: "#FFFFFF"
    val secondaryText: String get() = _secondaryText ?: "#999999"
    val accent: String get() = _accent ?: "#FFFFFF"
    val currentEvent: Fill get() = _currentEvent ?: Fill.Gradient(listOf("#1A33CC", "#6633E6"))
    val currentEventText: String get() = _currentEventText ?: "#FFFFFF"
    val currentEventBorder: String get() = _currentEventBorder ?: "#FFFFFF4D"
    val pastEventText: String get() = _pastEventText ?: "#34C759"
    val dividerColor: String get() = _dividerColor ?: "#FFFFFF"
    val onlineColor: String get() = _onlineColor ?: "#34C759"
    val offlineColor: String get() = _offlineColor ?: "#FF3B30"
}

data class ThemeTypography(
    @SerializedName("fontFamily") private val _fontFamily: String? = null,
    @SerializedName("scale") private val _scale: Float? = null,
    @SerializedName("headingSize") private val _headingSize: Float? = null,
    @SerializedName("subheadingSize") private val _subheadingSize: Float? = null,
    @SerializedName("clockSize") private val _clockSize: Float? = null,
    @SerializedName("dateSize") private val _dateSize: Float? = null,
    @SerializedName("eventTitleSize") private val _eventTitleSize: Float? = null,
    @SerializedName("eventTimeSize") private val _eventTimeSize: Float? = null,
    @SerializedName("eventEndTimeSize") private val _eventEndTimeSize: Float? = null,
    @SerializedName("currentTitleSize") private val _currentTitleSize: Float? = null,
    @SerializedName("currentTimeSize") private val _currentTimeSize: Float? = null,
    @SerializedName("facilitatorSize") private val _facilitatorSize: Float? = null,
) {
    val fontFamily: String get() = _fontFamily ?: "system"
    val scale: Float get() = _scale ?: 1.0f
    val headingSize: Float get() = (_headingSize ?: 32f) * scale
    val subheadingSize: Float get() = (_subheadingSize ?: 14f) * scale
    val clockSize: Float get() = (_clockSize ?: 24f) * scale
    val dateSize: Float get() = (_dateSize ?: 13f) * scale
    val eventTitleSize: Float get() = (_eventTitleSize ?: 14f) * scale
    val eventTimeSize: Float get() = (_eventTimeSize ?: 13f) * scale
    val eventEndTimeSize: Float get() = (_eventEndTimeSize ?: 10f) * scale
    val currentTitleSize: Float get() = (_currentTitleSize ?: 18f) * scale
    val currentTimeSize: Float get() = (_currentTimeSize ?: 16f) * scale
    val facilitatorSize: Float get() = (_facilitatorSize ?: 11f) * scale
}

data class ThemeHeader(
    @SerializedName("title") val title: String? = null,
    @SerializedName("showRoomName") private val _showRoomName: Boolean? = null,
    @SerializedName("showBuildingName") private val _showBuildingName: Boolean? = null,
    @SerializedName("showDate") private val _showDate: Boolean? = null,
    @SerializedName("showClock") private val _showClock: Boolean? = null,
    @SerializedName("showOnlineStatus") private val _showOnlineStatus: Boolean? = null,
    @SerializedName("logoPosition") private val _logoPosition: String? = null,
    @SerializedName("dividers") private val _dividers: Boolean? = null,
) {
    val showRoomName: Boolean get() = _showRoomName ?: true
    val showBuildingName: Boolean get() = _showBuildingName ?: true
    val showDate: Boolean get() = _showDate ?: true
    val showClock: Boolean get() = _showClock ?: true
    val showOnlineStatus: Boolean get() = _showOnlineStatus ?: true
    val logoPosition: String get() = _logoPosition ?: "none"
    val dividers: Boolean get() = _dividers ?: true
}

data class ThemeComponents(
    @SerializedName("eventRow") private val _eventRow: String? = null,
    @SerializedName("showCurrentEventHighlight") private val _showCurrentEventHighlight: Boolean? = null,
    @SerializedName("showFacilitator") private val _showFacilitator: Boolean? = null,
    @SerializedName("showPastEvents") private val _showPastEvents: Boolean? = null,
    @SerializedName("showTicker") private val _showTicker: Boolean? = null,
    @SerializedName("tickerText") val tickerText: String? = null,
    @SerializedName("clockPosition") private val _clockPosition: String? = null,
    @SerializedName("cornerRadius") private val _cornerRadius: Float? = null,
    @SerializedName("showRefreshButton") private val _showRefreshButton: Boolean? = null,
) {
    val eventRow: String get() = _eventRow ?: "title_left_time_right"
    val showCurrentEventHighlight: Boolean get() = _showCurrentEventHighlight ?: true
    val showFacilitator: Boolean get() = _showFacilitator ?: true
    val showPastEvents: Boolean get() = _showPastEvents ?: true
    val showTicker: Boolean get() = _showTicker ?: false
    val clockPosition: String get() = _clockPosition ?: "header_right"
    val cornerRadius: Float get() = _cornerRadius ?: 12f
    val showRefreshButton: Boolean get() = _showRefreshButton ?: true

    /** D2: the NOW card uses the regular radius + 4 (preserves today's 12 -> 16). */
    val currentCornerRadius: Float get() = cornerRadius + 4f
}

data class ThemeFooter(
    @SerializedName("show") private val _show: Boolean? = null,
    @SerializedName("showVersion") private val _showVersion: Boolean? = null,
    @SerializedName("showTenantInfo") private val _showTenantInfo: Boolean? = null,
) {
    val show: Boolean get() = _show ?: true
    val showVersion: Boolean get() = _showVersion ?: true
    val showTenantInfo: Boolean get() = _showTenantInfo ?: true
}

/**
 * A background/foreground fill. Decodes from either a hex string or an object with
 * a `type` discriminator (solid | gradient | image_blur), per the schema's `fill`.
 * The @JsonAdapter keeps the polymorphic decoding self-contained — no change to the
 * shared Gson in NetworkModule.
 */
@JsonAdapter(Fill.Deserializer::class)
sealed class Fill {
    data class Solid(val color: String) : Fill()
    data class Gradient(
        val colors: List<String>,
        val start: String = "topLeading",
        val end: String = "bottomTrailing",
    ) : Fill()
    data class ImageBlur(val url: String?, val blurRadius: Float = 20f, val fallback: String) : Fill()

    /**
     * Compose brush for a background. For parity (D4) the gradient uses Compose's
     * default linear direction (top-left -> bottom-right), matching the current
     * DisplayScreen `Brush.linearGradient(colors)` so the refactor is pixel-stable.
     * image_blur renders its solid `fallback` in v1; the blurred image is a follow-up.
     */
    fun asBackgroundBrush(): Brush = when (this) {
        is Solid -> SolidColor(parseHexColor(color))
        is Gradient -> Brush.linearGradient(colors.map { parseHexColor(it) })
        is ImageBlur -> SolidColor(parseHexColor(fallback))
    }

    class Deserializer : JsonDeserializer<Fill> {
        override fun deserialize(json: JsonElement, typeOfT: Type, ctx: JsonDeserializationContext): Fill {
            if (json.isJsonPrimitive) return Solid(json.asString)
            val obj = json.asJsonObject
            return when (obj.get("type")?.asString) {
                "gradient" -> Gradient(
                    colors = obj.getAsJsonArray("colors")?.map { it.asString } ?: listOf("#000000", "#000000"),
                    start = obj.get("start")?.asString ?: "topLeading",
                    end = obj.get("end")?.asString ?: "bottomTrailing",
                )
                "image_blur" -> ImageBlur(
                    url = obj.get("url")?.takeIf { !it.isJsonNull }?.asString,
                    blurRadius = obj.get("blurRadius")?.asFloat ?: 20f,
                    fallback = obj.get("fallback")?.asString ?: "#000000",
                )
                else -> Solid(obj.get("color")?.asString ?: "#000000")
            }
        }
    }
}

/** Parse #RRGGBB or #RRGGBBAA into a Compose Color. Falls back to transparent if unparseable. */
fun parseHexColor(hex: String?): Color {
    val s = (hex ?: "").trim().removePrefix("#")
    return try {
        when (s.length) {
            6 -> {
                val v = s.toLong(16)
                Color(
                    red = ((v shr 16) and 0xFF) / 255f,
                    green = ((v shr 8) and 0xFF) / 255f,
                    blue = (v and 0xFF) / 255f,
                    alpha = 1f,
                )
            }
            8 -> {
                val v = s.toLong(16)
                Color(
                    red = ((v shr 24) and 0xFF) / 255f,
                    green = ((v shr 16) and 0xFF) / 255f,
                    blue = ((v shr 8) and 0xFF) / 255f,
                    alpha = (v and 0xFF) / 255f,
                )
            }
            else -> Color.Transparent
        }
    } catch (e: NumberFormatException) {
        Color.Transparent
    }
}
