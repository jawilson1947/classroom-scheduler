package com.classroomscheduler.presentation.display

import android.graphics.Bitmap
import android.util.Base64
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.classroomscheduler.presentation.display.components.*
import java.util.*

@Composable
fun DisplayScreen(
    viewModel: DisplayViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showNarrativeDialog by remember { mutableStateOf<Event?>(null) }
    var showFacilitatorDialog by remember { mutableStateOf<Event?>(null) }
    
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
                roomName = uiState.room?.name ?: "Loading...",
                buildingName = uiState.room?.buildingName ?: "",
                isOnline = viewModel.isOnline()
            )
            
            // Event List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 32.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                val currentEvent = getCurrentEvent(uiState.events)
                val upcomingEvents = getUpcomingEvents(uiState.events)
                val pastEvents = getPastEvents(uiState.events)
                
                // Current Event
                if (currentEvent != null) {
                    item {
                        CurrentEventCard(
                            event = currentEvent,
                            onNarrativeClick = { showNarrativeDialog = currentEvent },
                            onFacilitatorClick = { showFacilitatorDialog = currentEvent }
                        )
                    }
                }
                
                // Upcoming Events
                items(upcomingEvents) { event ->
                    EventCard(
                        event = event,
                        isPast = false,
                        onNarrativeClick = { showNarrativeDialog = event },
                        onFacilitatorClick = { showFacilitatorDialog = event }
                    )
                }
                
                // Past Events
                items(pastEvents) { event ->
                    EventCard(
                        event = event,
                        isPast = true,
                        onNarrativeClick = { showNarrativeDialog = event },
                        onFacilitatorClick = { showFacilitatorDialog = event }
                    )
                }
                
                // No events message or Logo
                if (uiState.events.isEmpty() && !uiState.isLoading) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 60.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            uiState.room?.tenantLogoUrl?.let { logoUrl ->
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
            if (uiState.room?.tenantName != null && uiState.room.tenantAddress != null) {
                FooterView(
                    tenantName = uiState.room.tenantName,
                    tenantAddress = uiState.room.tenantAddress
                )
            }
        }
        
        // Floating Refresh Button
        FloatingActionButton(
            onClick = { viewModel.fetchEvents() },
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

private fun getCurrentEvent(events: List<Event>): Event? {
    val now = Date()
    return events.firstOrNull { event ->
        val start = event.displayStart
        val end = event.displayEnd
        start != null && end != null && now >= start && now <= end
    }
}

private fun getUpcomingEvents(events: List<Event>): List<Event> {
    val now = Date()
    return events.filter { event ->
        val start = event.displayStart
        start != null && start > now
    }
}

private fun getPastEvents(events: List<Event>): List<Event> {
    val now = Date()
    return events.filter { event ->
        val end = event.displayEnd
        end != null && end < now
    }
}
