package com.classroomscheduler.presentation.display.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun FooterView(
    tenantName: String,
    tenantAddress: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 40.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.5f))
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Box(
            modifier = Modifier.fillMaxWidth()
        ) {
            // Version - Left Aligned
            Text(
                text = "Ver 2.5.3",
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.9f),
                modifier = Modifier.align(Alignment.CenterStart)
            )
            
            // Tenant Info - Centered
            Text(
                text = "$tenantName | $tenantAddress",
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
                modifier = Modifier.align(Alignment.Center)
            )
        }
    }
}
