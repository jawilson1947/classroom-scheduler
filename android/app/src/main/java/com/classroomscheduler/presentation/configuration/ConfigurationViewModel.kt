package com.classroomscheduler.presentation.configuration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.classroomscheduler.data.models.AppConfig
import com.classroomscheduler.data.remote.ApiService
import com.classroomscheduler.data.remote.ValidateTokenRequest
import com.classroomscheduler.data.repository.ConfigRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Inject

@HiltViewModel
class ConfigurationViewModel @Inject constructor(
    private val configRepository: ConfigRepository,
    private val okHttpClient: OkHttpClient
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ConfigurationUiState())
    val uiState: StateFlow<ConfigurationUiState> = _uiState.asStateFlow()
    
    fun onPairingTokenChanged(token: String) {
        _uiState.value = _uiState.value.copy(pairingToken = token, errorMessage = null)
    }
    
    fun onRoomIdChanged(roomId: String) {
        _uiState.value = _uiState.value.copy(roomId = roomId)
    }
    
    fun onTenantIdChanged(tenantId: String) {
        _uiState.value = _uiState.value.copy(tenantId = tenantId)
    }
    
    fun onApiBaseUrlChanged(url: String) {
        _uiState.value = _uiState.value.copy(apiBaseURL = url)
    }
    
    fun pairDevice() {
        val token = _uiState.value.pairingToken.trim()
        val apiBaseURL = _uiState.value.apiBaseURL.trim()
        
        if (token.isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please enter a pairing token")
            return
        }
        
        _uiState.value = _uiState.value.copy(isPairing = true, errorMessage = null)
        
        viewModelScope.launch {
            try {
                // Clean token if user pasted full URL
                val cleanToken = if (token.contains("/")) {
                    token.split("/").last()
                } else {
                    token
                }
                
                // Create temporary API service for this request
                val retrofit = Retrofit.Builder()
                    .baseUrl(apiBaseURL)
                    .client(okHttpClient)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                
                val apiService = retrofit.create(ApiService::class.java)
                val response = apiService.validateToken(ValidateTokenRequest(cleanToken))
                
                if (response.isSuccessful && response.body() != null) {
                    val result = response.body()!!
                    val config = AppConfig(
                        roomId = result.room_id,
                        tenantId = result.tenant_id,
                        apiBaseURL = apiBaseURL,
                        deviceId = result.device_id
                    )
                    
                    configRepository.saveConfiguration(config)
                    _uiState.value = _uiState.value.copy(
                        isPairing = false,
                        isConfigured = true
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isPairing = false,
                        errorMessage = "Invalid token or server error"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isPairing = false,
                    errorMessage = e.message ?: "Connection error"
                )
            }
        }
    }
    
    fun saveManualConfiguration() {
        val roomId = _uiState.value.roomId.toIntOrNull()
        val tenantId = _uiState.value.tenantId.toIntOrNull()
        val apiBaseURL = _uiState.value.apiBaseURL.trim()
        
        if (roomId == null || tenantId == null || apiBaseURL.isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please fill all fields")
            return
        }
        
        val config = AppConfig(
            roomId = roomId,
            tenantId = tenantId,
            apiBaseURL = apiBaseURL,
            deviceId = null
        )
        
        configRepository.saveConfiguration(config)
        _uiState.value = _uiState.value.copy(isConfigured = true)
    }
}

data class ConfigurationUiState(
    val pairingToken: String = "",
    val roomId: String = "",
    val tenantId: String = "",
    val apiBaseURL: String = "https://ipad-scheduler.com",
    val isPairing: Boolean = false,
    val errorMessage: String? = null,
    val isConfigured: Boolean = false
)
