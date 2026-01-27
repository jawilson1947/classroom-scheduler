package com.classroomscheduler.services

import android.content.Context
import android.util.Log
import androidx.work.*
import com.classroomscheduler.data.remote.ApiService
import com.classroomscheduler.data.remote.HeartbeatRequest
import com.classroomscheduler.data.repository.ConfigRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class HeartbeatWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    private val TAG = "HeartbeatWorker"
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val configRepository = ConfigRepository(applicationContext)
            val config = configRepository.loadConfiguration()
            
            if (config?.deviceId == null) {
                Log.d(TAG, "No device ID configured, skipping heartbeat")
                return@withContext Result.success()
            }
            
            Log.d(TAG, "Sending heartbeat for device_id: ${config.deviceId}")
            
            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .build()
            
            val retrofit = Retrofit.Builder()
                .baseUrl(config.apiBaseURL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            
            val apiService = retrofit.create(ApiService::class.java)
            val response = apiService.sendHeartbeat(HeartbeatRequest(config.deviceId))
            
            if (response.isSuccessful) {
                Log.d(TAG, "Heartbeat sent successfully")
                Result.success()
            } else {
                Log.e(TAG, "Heartbeat failed: ${response.code()}")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Heartbeat error", e)
            Result.retry()
        }
    }
    
    companion object {
        private const val WORK_NAME = "heartbeat_work"
        
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val heartbeatRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(
                60, TimeUnit.SECONDS
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.LINEAR,
                    PeriodicWorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
            
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                heartbeatRequest
            )
        }
    }
}
