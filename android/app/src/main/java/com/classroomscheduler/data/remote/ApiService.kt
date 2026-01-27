package com.classroomscheduler.data.remote

import com.classroomscheduler.data.models.Event
import com.classroomscheduler.data.models.Room
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    @GET("api/rooms")
    suspend fun getRooms(
        @Query("id") roomId: Int,
        @Query("tenant_id") tenantId: Int
    ): Response<List<Room>>
    
    @GET("api/events")
    suspend fun getEvents(
        @Query("room_id") roomId: Int,
        @Query("tenant_id") tenantId: Int,
        @Query("start_date") startDate: String,
        @Query("end_date") endDate: String,
        @Query("device_id") deviceId: Int? = null
    ): Response<List<Event>>
    
    @POST("api/device/validate-token")
    suspend fun validateToken(
        @Body request: ValidateTokenRequest
    ): Response<ValidateTokenResponse>
    
    @POST("api/device/heartbeat")
    suspend fun sendHeartbeat(
        @Body request: HeartbeatRequest
    ): Response<Unit>
}

data class ValidateTokenRequest(
    val token: String
)

data class ValidateTokenResponse(
    val room_id: Int,
    val tenant_id: Int,
    val device_id: Int?
)

data class HeartbeatRequest(
    val device_id: Int
)
