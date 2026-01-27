package com.classroomscheduler.presentation.display.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage

@Composable
fun FacilitatorIcon(
    iconUrl: String,
    onClick: () -> Unit
) {
    AsyncImage(
        model = iconUrl,
        contentDescription = "Facilitator Icon",
        modifier = Modifier
            .size(20.dp)
            .clip(CircleShape)
            .clickable { onClick() },
        contentScale = ContentScale.Crop
    )
}
