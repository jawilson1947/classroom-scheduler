package com.classroomscheduler.data.remote

import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.util.concurrent.TimeUnit

class SseService(private val client: OkHttpClient) {
    
    private val TAG = "SseService"
    
    fun connectToEventStream(
        apiBaseUrl: String,
        roomId: Int,
        tenantId: Int,
        deviceId: Int?
    ): Flow<SseEvent> = callbackFlow {
        var eventSource: EventSource? = null
        
        fun connect() {
            var url = "$apiBaseUrl/api/events/stream?room_id=$roomId&tenant_id=$tenantId"
            if (deviceId != null) {
                url += "&device_id=$deviceId"
            }
            
            Log.d(TAG, "Connecting to SSE: $url")
            
            val request = Request.Builder()
                .url(url)
                .header("Accept", "text/event-stream")
                .header("Cache-Control", "no-cache")
                .build()
            
            val listener = object : EventSourceListener() {
                override fun onOpen(eventSource: EventSource, response: Response) {
                    Log.d(TAG, "SSE Connection established")
                    trySend(SseEvent.Connected)
                }
                
                override fun onEvent(
                    eventSource: EventSource,
                    id: String?,
                    type: String?,
                    data: String
                ) {
                    Log.d(TAG, "SSE Event received: type=$type, data=$data")
                    
                    try {
                        val gson = Gson()
                        val eventData = gson.fromJson(data, SseEventData::class.java)
                        
                        when (eventData.type) {
                            "event_created", "event_updated", "event_deleted" -> {
                                trySend(SseEvent.EventUpdate(eventData.type))
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing SSE event", e)
                    }
                }
                
                override fun onClosed(eventSource: EventSource) {
                    Log.d(TAG, "SSE Connection closed")
                    trySend(SseEvent.Disconnected)
                }
                
                override fun onFailure(
                    eventSource: EventSource,
                    t: Throwable?,
                    response: Response?
                ) {
                    Log.e(TAG, "SSE Connection error", t)
                    trySend(SseEvent.Error(t?.message ?: "Unknown error"))
                    
                    // Attempt to reconnect after 5 seconds
                    kotlinx.coroutines.MainScope().launch {
                        delay(5000)
                        Log.d(TAG, "Attempting to reconnect SSE...")
                        connect()
                    }
                }
            }
            
            eventSource = EventSources.createFactory(client)
                .newEventSource(request, listener)
        }
        
        connect()
        
        awaitClose {
            Log.d(TAG, "Closing SSE connection")
            eventSource?.cancel()
        }
    }
}

sealed class SseEvent {
    object Connected : SseEvent()
    object Disconnected : SseEvent()
    data class EventUpdate(val type: String) : SseEvent()
    data class Error(val message: String) : SseEvent()
}

data class SseEventData(
    val type: String
)

// Extension to launch coroutine in MainScope
private fun kotlinx.coroutines.CoroutineScope.launch(
    block: suspend kotlinx.coroutines.CoroutineScope.() -> Unit
) = kotlinx.coroutines.launch { block() }
