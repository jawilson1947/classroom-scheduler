package com.classroomscheduler.presentation.display.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.classroomscheduler.data.models.Event
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun EventCard(
    event: Event,
    isPast: Boolean,
    onNarrativeClick: () -> Unit,
    onFacilitatorClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = Color(0xFF141F47).copy(alpha = if (isPast) 0.5f else 1f),
                shape = RoundedCornerShape(12.dp)
            )
            .border(
                width = 1.dp,
                color = Color(0xFF404040),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                // Event Title
                Text(
                    text = event.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isPast) Color(0xFF4ADE80).copy(alpha = 0.9f) else Color.White,
                    fontStyle = if (isPast) FontStyle.Italic else FontStyle.Normal,
                    textDecoration = if (!event.narrative.isNullOrEmpty()) TextDecoration.Underline else null,
                    modifier = if (!event.narrative.isNullOrEmpty()) {
                        Modifier.clickable { onNarrativeClick() }
                    } else {
                        Modifier
                    }
                )
                
                // Facilitator
                if (event.facilitatorName != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = event.facilitatorName,
                            fontSize = 11.sp,
                            color = if (isPast) Color(0xFF4ADE80).copy(alpha = 0.7f) else Color(0xFF999999),
                            fontStyle = if (isPast) FontStyle.Italic else FontStyle.Normal
                        )
                        
                        if (event.facilitatorId != null && !event.facilitatorIconUrl.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.width(6.dp))
                            FacilitatorIcon(
                                iconUrl = event.facilitatorIconUrl,
                                onClick = onFacilitatorClick
                            )
                        }
                    }
                }
            }
            
            // Time
            Column(
                horizontalAlignment = Alignment.End
            ) {
                event.displayStart?.let { start ->
                    Text(
                        text = formatTime(start),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (isPast) Color(0xFF4ADE80).copy(alpha = 0.9f) else Color.White,
                        fontStyle = if (isPast) FontStyle.Italic else FontStyle.Normal
                    )
                }
                
                event.displayEnd?.let { end ->
                    Text(
                        text = formatTime(end),
                        fontSize = 10.sp,
                        color = if (isPast) Color(0xFF4ADE80).copy(alpha = 0.7f) else Color(0xFF999999),
                        fontStyle = if (isPast) FontStyle.Italic else FontStyle.Normal
                    )
                }
            }
        }
    }
}

private fun formatTime(date: Date): String {
    val format = SimpleDateFormat("h:mm a", Locale.US)
    return format.format(date)
}
