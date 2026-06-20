package com.classroomscheduler.presentation.display

import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.classroomscheduler.data.models.Event
import com.classroomscheduler.data.models.Room
import com.classroomscheduler.presentation.display.components.*
import java.util.*

/**
 * Thin container: reads the view model + holds dialog state, delegates rendering
 * to [AgendaBoard]. Splitting the presentation out lets snapshot tests / previews
 * render the board from fixtures (fixed clock, events, animations off) without a
 * Hilt graph. Behavior and composition output are unchanged.
 */
@Composable
fun DisplayScreen(
    viewModel: DisplayViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showNarrativeDialog by remember { mutableStateOf<Event?>(null) }
    var showFacilitatorDialog by remember { mutableStateOf<Event?>(null) }

    AgendaBoard(
        room = uiState.room,
        events = uiState.events,
        now = Date(),
        isOnline = viewModel.isOnline(),
        isLoading = uiState.isLoading,
        animated = true,
        onRefresh = { viewModel.fetchEvents() },
        onNarrativeClick = { showNarrativeDialog = it },
        onFacilitatorClick = { showFacilitatorDialog = it }
    )

    // Narrative Dialog
    showNarrativeDialog?.let { event ->
        NarrativeDialog(
            title = event.title,
            htmlContent = event.narrative ?: "",
            onDismiss = { showNarrativeDialog = null }
        )
    }

    // Facilitator Bio Dialog
    showFacilitatorDialog?.let { event ->
        FacilitatorBioDialog(
            name = event.facilitatorName ?: "Facilitator",
            pictureUrl = event.facilitatorPictureUrl,
            bio = event.facilitatorBio,
            onDismiss = { showFacilitatorDialog = null }
        )
    }
}

/**
 * Presentational agenda board. No view model dependency — all inputs are injected,
 * so this is directly renderable in tests/previews. `now` drives current/upcoming/past
 * partitioning; `animated` toggles the NOW-card pulse for deterministic snapshots.
 */
@Composable
fun AgendaBoard(
    room: Room?,
    events: List<Event>,
    now: Date,
    isOnline: Boolean,
    isLoading: Boolean,
    animated: Boolean = true,
    onRefresh: () -> Unit,
    onNarrativeClick: (Event) -> Unit,
    onFacilitatorClick: (Event) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF0D0F14),
                        Color(0xFF141F47),
                        Color(0xFF0D0F14)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header
            HeaderView(
                roomName = room?.name ?: "Loading...",
                buildingName = room?.buildingName ?: "",
                isOnline = isOnline
            )

            // Event List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 32.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                val currentEvent = getCurrentEvent(events, now)
                val upcomingEvents = getUpcomingEvents(events, now)
                val pastEvents = getPastEvents(events, now)

                // Current Event
                if (currentEvent != null) {
                    item {
                        CurrentEventCard(
                            event = currentEvent,
                            animated = animated,
                            onNarrativeClick = { onNarrativeClick(currentEvent) },
                            onFacilitatorClick = { onFacilitatorClick(currentEvent) }
                        )
                    }
                }

                // Upcoming Events
                items(upcomingEvents) { event ->
                    EventCard(
                        event = event,
                        isPast = false,
                        onNarrativeClick = { onNarrativeClick(event) },
                        onFacilitatorClick = { onFacilitatorClick(event) }
                    )
                }

                // Past Events
                items(pastEvents) { event ->
                    EventCard(
                        event = event,
                        isPast = true,
                        onNarrativeClick = { onNarrativeClick(event) },
                        onFacilitatorClick = { onFacilitatorClick(event) }
                    )
                }

                // No events message or Logo
                if (events.isEmpty() && !isLoading) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 60.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            room?.tenantLogoUrl?.let { logoUrl ->
                                if (logoUrl.startsWith("data:image")) {
                                    // Display base64 logo
                                    AsyncImage(
                                        model = logoUrl,
                                        contentDescription = "Tenant Logo",
                                        modifier = Modifier.size(400.dp),
                                        contentScale = ContentScale.Fit
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                text = "No events scheduled for today",
                                fontSize = 16.sp,
                                color = Color(0xFF808080)
                            )
                        }
                    }
                }
            }

            // Footer
            val tenantName = room?.tenantName
            val tenantAddress = room?.tenantAddress
            if (tenantName != null && tenantAddress != null) {
                FooterView(
                    tenantName = tenantName,
                    tenantAddress = tenantAddress
                )
            }
        }

        // Floating Refresh Button
        FloatingActionButton(
            onClick = onRefresh,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp),
            containerColor = Color.Black.copy(alpha = 0.3f)
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = "Refresh",
                tint = Color.White.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
fun NarrativeDialog(
    title: String,
    htmlContent: String,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        settings.javaScriptEnabled = false
                        loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(400.dp)
            )
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
fun FacilitatorBioDialog(
    name: String,
    pictureUrl: String?,
    bio: String?,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(name) },
        text = {
            val htmlContent = buildString {
                append("<style>")
                append("body { font-family: sans-serif; font-size: 1.2rem; line-height: 1.6; color: #333; padding: 1rem; }")
                append(".facilitator-img { float: left; margin-right: 20px; margin-bottom: 20px; width: 150px; height: auto; border-radius: 12px; }")
                append("</style>")
                append("<div>")
                if (!pictureUrl.isNullOrEmpty()) {
                    append("<img src=\"$pictureUrl\" class=\"facilitator-img\" alt=\"$name\" />")
                }
                append(bio ?: "<p>No biography available.</p>")
                append("</div>")
            }

            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        settings.javaScriptEnabled = false
                        loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(400.dp)
            )
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

private fun getCurrentEvent(events: List<Event>, now: Date): Event? {
    return events.firstOrNull { event ->
        val start = event.displayStart
        val end = event.displayEnd
        start != null && end != null && now >= start && now <= end
    }
}

private fun getUpcomingEvents(events: List<Event>, now: Date): List<Event> {
    return events.filter { event ->
        val start = event.displayStart
        start != null && start > now
    }
}

private fun getPastEvents(events: List<Event>, now: Date): List<Event> {
    return events.filter { event ->
        val end = event.displayEnd
        end != null && end < now
    }
}
