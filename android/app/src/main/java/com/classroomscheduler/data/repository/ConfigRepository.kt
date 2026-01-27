package com.classroomscheduler.data.repository

import android.content.Context
import android.content.RestrictionsManager
import android.os.Build
import com.classroomscheduler.data.models.AppConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConfigRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs = context.getSharedPreferences("app_config", Context.MODE_PRIVATE)
    
    fun loadConfiguration(): AppConfig? {
        // Try to load from MDM managed configuration first
        loadFromMDM()?.let { return it }
        
        // Fall back to SharedPreferences
        return loadFromPreferences()
    }
    
    fun isConfigured(): Boolean {
        return loadConfiguration() != null
    }
    
    fun saveConfiguration(config: AppConfig) {
        prefs.edit().apply {
            putInt("roomId", config.roomId)
            putInt("tenantId", config.tenantId)
            putString("apiBaseURL", config.apiBaseURL)
            config.deviceId?.let { putInt("deviceId", it) }
            apply()
        }
    }
    
    private fun loadFromMDM(): AppConfig? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val restrictionsManager = context.getSystemService(Context.RESTRICTIONS_SERVICE) as? RestrictionsManager
            val restrictions = restrictionsManager?.applicationRestrictions
            
            if (restrictions != null && !restrictions.isEmpty) {
                val roomId = restrictions.getInt("roomId", -1)
                val tenantId = restrictions.getInt("tenantId", -1)
                val apiBaseURL = restrictions.getString("apiBaseURL")
                val deviceId = restrictions.getInt("deviceId", -1)
                
                if (roomId != -1 && tenantId != -1 && !apiBaseURL.isNullOrEmpty()) {
                    return AppConfig(
                        roomId = roomId,
                        tenantId = tenantId,
                        apiBaseURL = apiBaseURL,
                        deviceId = if (deviceId != -1) deviceId else null
                    )
                }
            }
        }
        return null
    }
    
    private fun loadFromPreferences(): AppConfig? {
        val roomId = prefs.getInt("roomId", -1)
        val tenantId = prefs.getInt("tenantId", -1)
        val apiBaseURL = prefs.getString("apiBaseURL", null)
        val deviceId = prefs.getInt("deviceId", -1)
        
        return if (roomId != -1 && tenantId != -1 && !apiBaseURL.isNullOrEmpty()) {
            AppConfig(
                roomId = roomId,
                tenantId = tenantId,
                apiBaseURL = apiBaseURL,
                deviceId = if (deviceId != -1) deviceId else null
            )
        } else {
            null
        }
    }
}
