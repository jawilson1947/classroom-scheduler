package com.classroomscheduler.presentation.configuration

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun ConfigurationScreen(
    viewModel: ConfigurationViewModel = hiltViewModel(),
    onConfigured: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }
    
    LaunchedEffect(uiState.isConfigured) {
        if (uiState.isConfigured) {
            onConfigured()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF121317),
                        Color(0xFF1C1D21)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Device Setup",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.Transparent,
                contentColor = Color.White
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Pairing Token") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Manual Config") }
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            when (selectedTab) {
                0 -> PairingTokenTab(
                    pairingToken = uiState.pairingToken,
                    onPairingTokenChanged = viewModel::onPairingTokenChanged,
                    isPairing = uiState.isPairing,
                    errorMessage = uiState.errorMessage,
                    onPairDevice = viewModel::pairDevice
                )
                1 -> ManualConfigTab(
                    roomId = uiState.roomId,
                    tenantId = uiState.tenantId,
                    apiBaseURL = uiState.apiBaseURL,
                    onRoomIdChanged = viewModel::onRoomIdChanged,
                    onTenantIdChanged = viewModel::onTenantIdChanged,
                    onApiBaseUrlChanged = viewModel::onApiBaseUrlChanged,
                    onSaveConfiguration = viewModel::saveManualConfiguration
                )
            }
        }
    }
}

@Composable
fun PairingTokenTab(
    pairingToken: String,
    onPairingTokenChanged: (String) -> Unit,
    isPairing: Boolean,
    errorMessage: String?,
    onPairDevice: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Enter the pairing token displayed in the admin dashboard.",
            fontSize = 14.sp,
            color = Color(0xFF999999),
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = pairingToken,
            onValueChange = onPairingTokenChanged,
            label = { Text("Pairing Token") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedContainerColor = Color(0xFF262626),
                unfocusedContainerColor = Color(0xFF262626),
                focusedBorderColor = Color(0xFF4D4D4D),
                unfocusedBorderColor = Color(0xFF4D4D4D),
                focusedLabelColor = Color(0xFF999999),
                unfocusedLabelColor = Color(0xFF999999)
            ),
            singleLine = true
        )
        
        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = errorMessage,
                color = Color.Red,
                fontSize = 12.sp
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = onPairDevice,
            modifier = Modifier.fillMaxWidth(),
            enabled = pairingToken.isNotEmpty() && !isPairing,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF3B82F6)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isPairing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White
                )
            } else {
                Text(
                    text = "Pair Device",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun ManualConfigTab(
    roomId: String,
    tenantId: String,
    apiBaseURL: String,
    onRoomIdChanged: (String) -> Unit,
    onTenantIdChanged: (String) -> Unit,
    onApiBaseUrlChanged: (String) -> Unit,
    onSaveConfiguration: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp)
    ) {
        OutlinedTextField(
            value = roomId,
            onValueChange = onRoomIdChanged,
            label = { Text("Room ID") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedContainerColor = Color(0xFF262626),
                unfocusedContainerColor = Color(0xFF262626),
                focusedBorderColor = Color(0xFF4D4D4D),
                unfocusedBorderColor = Color(0xFF4D4D4D),
                focusedLabelColor = Color(0xFF999999),
                unfocusedLabelColor = Color(0xFF999999)
            ),
            singleLine = true
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = tenantId,
            onValueChange = onTenantIdChanged,
            label = { Text("Tenant ID") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedContainerColor = Color(0xFF262626),
                unfocusedContainerColor = Color(0xFF262626),
                focusedBorderColor = Color(0xFF4D4D4D),
                unfocusedBorderColor = Color(0xFF4D4D4D),
                focusedLabelColor = Color(0xFF999999),
                unfocusedLabelColor = Color(0xFF999999)
            ),
            singleLine = true
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = apiBaseURL,
            onValueChange = onApiBaseUrlChanged,
            label = { Text("API Base URL") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedContainerColor = Color(0xFF262626),
                unfocusedContainerColor = Color(0xFF262626),
                focusedBorderColor = Color(0xFF4D4D4D),
                unfocusedBorderColor = Color(0xFF4D4D4D),
                focusedLabelColor = Color(0xFF999999),
                unfocusedLabelColor = Color(0xFF999999)
            ),
            singleLine = true
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = onSaveConfiguration,
            modifier = Modifier.fillMaxWidth(),
            enabled = roomId.isNotEmpty() && tenantId.isNotEmpty() && apiBaseURL.isNotEmpty(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF3B82F6)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = "Save Configuration",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
