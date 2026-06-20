package com.classroomscheduler.snapshot

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import com.classroomscheduler.presentation.display.AgendaBoard
import com.classroomscheduler.presentation.display.components.CurrentEventCard
import com.classroomscheduler.presentation.display.components.EventCard
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.util.Locale
import java.util.TimeZone

/**
 * Pixel-parity gate (Phase 2b), Android side.
 *
 * Record:  ./gradlew :app:recordRoborazziDebug   (writes src/test/snapshots/*.png)
 * Verify:  ./gradlew :app:verifyRoborazziDebug    (fails on diff)
 *
 * After the token-swap refactor, re-record and confirm the ONLY changed pixels are
 * the two D1 convergence colors (background outer stops #0D0F14 -> #0D0F33,
 * past-event green #4ADE80 -> #34C759); commit the new baseline with that note.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w1366dp-h1024dp-xhdpi")
class DisplayParityTest {

    @get:Rule
    val compose = createComposeRule()

    // Dark navy used by system_default, for components shown in isolation.
    private val bg = Color(0xFF0D0F14)

    @Before
    fun setup() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
        Locale.setDefault(Locale.US)
    }

    @Test
    fun systemDefault_agenda() {
        compose.setContent {
            AgendaBoard(
                room = SampleData.room,
                events = SampleData.events,
                now = SampleData.now,
                isOnline = true,
                isLoading = false,
                animated = false,
                onRefresh = {},
                onNarrativeClick = {},
                onFacilitatorClick = {}
            )
        }
        compose.onRoot().captureRoboImage("src/test/snapshots/agenda_systemDefault.png")
    }

    @Test
    fun currentEventCard() {
        compose.setContent {
            CurrentEventCard(
                event = SampleData.currentEvent,
                animated = false,
                onNarrativeClick = {},
                onFacilitatorClick = {}
            )
        }
        compose.onRoot().captureRoboImage("src/test/snapshots/current_event_card.png")
    }

    @Test
    fun eventCard_upcoming() {
        compose.setContent {
            EventCard(
                event = SampleData.upcomingEvent,
                isPast = false,
                onNarrativeClick = {},
                onFacilitatorClick = {}
            )
        }
        compose.onRoot().captureRoboImage("src/test/snapshots/event_card_upcoming.png")
    }

    @Test
    fun eventCard_past() {
        compose.setContent {
            EventCard(
                event = SampleData.pastEvent,
                isPast = true,
                onNarrativeClick = {},
                onFacilitatorClick = {}
            )
        }
        compose.onRoot().captureRoboImage("src/test/snapshots/event_card_past.png")
    }
}
