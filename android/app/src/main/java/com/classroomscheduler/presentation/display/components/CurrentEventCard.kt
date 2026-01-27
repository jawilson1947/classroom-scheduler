package com.classroomscheduler.presentation.display.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.classroomscheduler.data.models.Event
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CurrentEventCard(
    event: Event,
    onNarrativeClick: () -> Unit,
    onFacilitatorClick: () -> Unit
) {
    var isAnimating by remember { mutableStateOf(true) }
    
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.01f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dotAlpha"
    )
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .shadow(
                elevation = 10.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = Color(0xFF3B82F6).copy(alpha = 0.3f)
            )
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF1A33CC), // Royal Blue
                        Color(0xFF6633E6)  // Electric Purple
                    )
                ),
                shape = RoundedCornerShape(16.dp)
            )
            .padding(20.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                // NOW Badge
                Row(
                    modifier = Modifier
                        .background(
                            color = Color.White.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(
                                color = Color.White.copy(alpha = dotAlpha),
                                shape = CircleShape
                            )
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "NOW",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                }
                
                Spacer(modifier = Modifier.height(6.dp))
                
                // Event Title
                Text(
                    text = event.title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
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
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                        
                        if (event.facilitatorId != null && !event.facilitatorIconUrl.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.width(8.dp))
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
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                
                event.displayEnd?.let { end ->
                    Text(
                        text = "ends ${formatTime(end)}",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.8f)
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
