package com.classroomscheduler.presentation.display.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HeaderView(
    roomName: String,
    buildingName: String,
    isOnline: Boolean
) {
    var currentTime by remember { mutableStateOf(Date()) }
    
    LaunchedEffect(Unit) {
        while (true) {
            currentTime = Date()
            delay(1000)
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 24.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column {
                Text(
                    text = roomName,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                
                Text(
                    text = buildingName,
                    fontSize = 14.sp,
                    color = Color(0xFF999999)
                )
            }
            
            Column(
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = formatTime(currentTime),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                
                Text(
                    text = formatDate(currentTime),
                    fontSize = 13.sp,
                    color = Color(0xFF999999)
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(
                                color = if (isOnline) Color.Green else Color.Red,
                                shape = CircleShape
                            )
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isOnline) "Online" else "Offline",
                        fontSize = 10.sp,
                        color = if (isOnline) Color.Green else Color.Red
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White)
        )
    }
}

private fun formatTime(date: Date): String {
    val format = SimpleDateFormat("h:mm a", Locale.US)
    return format.format(date)
}

private fun formatDate(date: Date): String {
    val format = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.US)
    return format.format(date)
}
