package com.classroomscheduler.presentation.display

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.classroomscheduler.data.models.AppConfig
import com.classroomscheduler.data.models.Event
import com.classroomscheduler.data.models.Room
import com.classroomscheduler.data.remote.ApiService
import com.classroomscheduler.data.remote.SseEvent
import com.classroomscheduler.data.remote.SseService
import com.classroomscheduler.data.repository.ConfigRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class DisplayViewModel @Inject constructor(
    private val configRepository: ConfigRepository,
    private val sseService: SseService,
    private val okHttpClient: OkHttpClient
) : ViewModel() {
    
    private val TAG = "DisplayViewModel"
    
    private val _uiState = MutableStateFlow(DisplayUiState())
    val uiState: StateFlow<DisplayUiState> = _uiState.asStateFlow()
    
    private var apiService: ApiService? = null
    private var config: AppConfig? = null
    
    init {
        loadConfiguration()
    }
    
    private fun loadConfiguration() {
        config = configRepository.loadConfiguration()
        config?.let { cfg ->
            // Create API service with actual base URL
            val retrofit = Retrofit.Builder()
                .baseUrl(cfg.apiBaseURL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            
            apiService = retrofit.create(ApiService::class.java)
            
            // Start fetching data
            fetchRoom()
            fetchEvents()
            connectToSse()
            startPollingFallback()
        }
    }
    
    private fun fetchRoom() {
        val cfg = config ?: return
        val api = apiService ?: return
        
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true)
                val response = api.getRooms(cfg.roomId, cfg.tenantId)
                
                if (response.isSuccessful && response.body() != null) {
                    val rooms = response.body()!!
                    val room = rooms.firstOrNull { it.id == cfg.roomId }
                    _uiState.value = _uiState.value.copy(
                        room = room,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching room", e)
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }
    
    fun fetchEvents() {
        val cfg = config ?: return
        val api = apiService ?: return
        
        viewModelScope.launch {
            try {
                Log.d(TAG, "Fetching events...")
                _uiState.value = _uiState.value.copy(isLoading = true)
                
                val calendar = Calendar.getInstance()
                val startOfMonth = calendar.apply {
                    set(Calendar.DAY_OF_MONTH, 1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                }.time
                
                val endOfMonth = calendar.apply {
                    add(Calendar.MONTH, 1)
                    add(Calendar.DAY_OF_MONTH, -1)
                    set(Calendar.HOUR_OF_DAY, 23)
                    set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59)
                }.time
                
                val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                dateFormat.timeZone = TimeZone.getTimeZone("UTC")
                
                val startDate = dateFormat.format(startOfMonth)
                val endDate = dateFormat.format(endOfMonth)
                
                val response = api.getEvents(
                    roomId = cfg.roomId,
                    tenantId = cfg.tenantId,
                    startDate = startDate,
                    endDate = endDate,
                    deviceId = cfg.deviceId
                )
                
                if (response.isSuccessful && response.body() != null) {
                    val allEvents = response.body()!!
                    Log.d(TAG, "Fetched ${allEvents.size} events")
                    
                    val todayEvents = allEvents.filter { it.occursToday() }
                        .sortedBy { it.displayStart }
                    
                    Log.d(TAG, "Filtered to ${todayEvents.size} events for today")
                    
                    _uiState.value = _uiState.value.copy(
                        events = todayEvents,
                        isLoading = false,
                        lastSuccessfulFetch = Date()
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching events", e)
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }
    
    private fun connectToSse() {
        val cfg = config ?: return
        
        viewModelScope.launch {
            sseService.connectToEventStream(
                apiBaseUrl = cfg.apiBaseURL,
                roomId = cfg.roomId,
                tenantId = cfg.tenantId,
                deviceId = cfg.deviceId
            ).collect { event ->
                when (event) {
                    is SseEvent.Connected -> {
                        Log.d(TAG, "SSE Connected")
                        _uiState.value = _uiState.value.copy(isConnected = true)
                    }
                    is SseEvent.Disconnected -> {
                        Log.d(TAG, "SSE Disconnected")
                        _uiState.value = _uiState.value.copy(isConnected = false)
                    }
                    is SseEvent.EventUpdate -> {
                        Log.d(TAG, "SSE Event: ${event.type}")
                        fetchEvents()
                    }
                    is SseEvent.Error -> {
                        Log.e(TAG, "SSE Error: ${event.message}")
                        _uiState.value = _uiState.value.copy(isConnected = false)
                    }
                }
            }
        }
    }
    
    private fun startPollingFallback() {
        viewModelScope.launch {
            while (true) {
                delay(30000) // 30 seconds
                
                // Only poll if SSE is disconnected and not currently loading
                if (!_uiState.value.isConnected && !_uiState.value.isLoading) {
                    val lastFetch = _uiState.value.lastSuccessfulFetch
                    val now = Date()
                    
                    if (lastFetch == null || (now.time - lastFetch.time) > 30000) {
                        Log.d(TAG, "SSE disconnected, triggering fallback poll")
                        fetchEvents()
                    }
                }
            }
        }
    }
    
    fun isOnline(): Boolean {
        if (_uiState.value.isConnected) return true
        
        val lastFetch = _uiState.value.lastSuccessfulFetch ?: return false
        val now = Date()
        return (now.time - lastFetch.time) < 60000 // Within last 60 seconds
    }
}

data class DisplayUiState(
    val room: Room? = null,
    val events: List<Event> = emptyList(),
    val isLoading: Boolean = false,
    val isConnected: Boolean = false,
    val lastSuccessfulFetch: Date? = null
)
