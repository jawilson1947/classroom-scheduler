package com.classroomscheduler.data.models

data class AppConfig(
    val roomId: Int,
    val tenantId: Int,
    val apiBaseURL: String,
    val deviceId: Int? = null
)
