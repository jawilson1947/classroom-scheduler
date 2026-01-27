package com.classroomscheduler.data.models

import com.google.gson.annotations.SerializedName

data class Room(
    val id: Int,
    val name: String,
    @SerializedName("building_name")
    val buildingName: String,
    @SerializedName("tenant_name")
    val tenantName: String?,
    @SerializedName("tenant_address")
    val tenantAddress: String?,
    @SerializedName("tenant_logo_url")
    val tenantLogoUrl: String?
)
