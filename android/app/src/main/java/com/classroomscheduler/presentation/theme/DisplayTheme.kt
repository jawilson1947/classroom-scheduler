package com.classroomscheduler.presentation.theme

import androidx.compose.runtime.compositionLocalOf
import com.classroomscheduler.data.models.ThemeDefinition

/**
 * Provides the active display theme down the agenda composition. Mirror of iOS's
 * ThemeProvider/@EnvironmentObject. Default is system_default so previews and any
 * un-provided subtree still render.
 *
 * Added in the injectability step (non-visual). Consumed by the display composables
 * in the token-swap step — until then the views still render literals, so providing
 * this does not change output.
 */
val LocalDisplayTheme = compositionLocalOf { ThemeDefinition.systemDefault() }

/**
 * Layout-archetype resolution. v1 supports only `agenda_list`; an unknown or
 * unsupported `layout` falls back to system_default so a display never breaks.
 */
object DisplayLayout {
    fun resolve(theme: ThemeDefinition?): ThemeDefinition =
        if (theme != null && theme.isLayoutSupported) theme else ThemeDefinition.systemDefault()
}
