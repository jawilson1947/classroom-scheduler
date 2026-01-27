package com.classroomscheduler

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import com.classroomscheduler.data.repository.ConfigRepository
import com.classroomscheduler.presentation.configuration.ConfigurationScreen
import com.classroomscheduler.presentation.display.DisplayScreen
import com.classroomscheduler.presentation.theme.ClassroomSchedulerTheme
import com.classroomscheduler.services.HeartbeatWorker
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var configRepository: ConfigRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Hide system UI for fullscreen experience
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )
        
        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Start heartbeat worker
        HeartbeatWorker.schedule(this)
        
        setContent {
            ClassroomSchedulerTheme {
                val isConfigured = configRepository.isConfigured()
                
                if (isConfigured) {
                    DisplayScreen()
                } else {
                    ConfigurationScreen(
                        onConfigured = {
                            // Restart activity to load display screen
                            recreate()
                        }
                    )
                }
            }
        }
    }
}
