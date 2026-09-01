package com.shoplytics.app.presentation.location

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.Address

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationPickerScreen(
    onConfirmLocation: (Address) -> Unit,
    onBack: () -> Unit
) {
    var houseFlat by remember { mutableStateOf("Flat 402, Royal Residency") }
    var streetArea by remember { mutableStateOf("Road No 12, Banjara Hills") }
    var city by remember { mutableStateOf("Hyderabad") }
    var state by remember { mutableStateOf("Telangana") }
    var postalCode by remember { mutableStateOf("500034") }
    var label by remember { mutableStateOf("HOME") }
    var latitude by remember { mutableStateOf(17.4126) }
    var longitude by remember { mutableStateOf(78.4482) }

    var isLocating by remember { mutableStateOf(false) }

    fun useCurrentLocation() {
        isLocating = true
        // Simulating Google Maps / Location API reverse geocoding update
        latitude = 17.4150
        longitude = 78.4490
        houseFlat = "Plot 18, Innovation Hub"
        streetArea = "HITEC City Phase 2"
        city = "Hyderabad"
        postalCode = "500081"
        isLocating = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Choose Delivery Location", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardBg)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkBg)
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Interactive Map Visual Representation
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Map Marker",
                            tint = PrimaryCyan,
                            modifier = Modifier.size(54.dp)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "📍 $city, $state (Lat: ${String.format("%.4f", latitude)}, Lng: ${String.format("%.4f", longitude)})",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Interactive Google Maps Location Picker",
                            fontSize = 10.sp,
                            color = TextMuted
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Use Current Location Button
            Button(
                onClick = { useCurrentLocation() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
            ) {
                if (isLocating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("USE CURRENT GPS LOCATION", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text("Address Details:", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = houseFlat,
                onValueChange = { houseFlat = it },
                label = { Text("House / Flat / Building No.") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = streetArea,
                onValueChange = { streetArea = it },
                label = { Text("Street / Road / Area") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = city,
                    onValueChange = { city = it },
                    label = { Text("City") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = postalCode,
                    onValueChange = { postalCode = it },
                    label = { Text("Postal Code") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text("Save Address As:", fontSize = 12.sp, color = TextMuted)
            Spacer(modifier = Modifier.height(6.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("HOME", "WORK", "OTHER").forEach { l ->
                    FilterChip(
                        selected = label == l,
                        onClick = { label = l },
                        label = { Text(l) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    val fullAdd = "$houseFlat, $streetArea, $city, $state - $postalCode"
                    val addr = Address(
                        label = label,
                        fullName = "Harshith Narra",
                        phone = "9876543210",
                        houseFlat = houseFlat,
                        street = streetArea,
                        area = streetArea,
                        city = city,
                        state = state,
                        postalCode = postalCode,
                        latitude = latitude,
                        longitude = longitude,
                        isDefault = 1
                    )
                    onConfirmLocation(addr)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
            ) {
                Text("CONFIRM DELIVERY LOCATION", fontWeight = FontWeight.Bold, color = DarkBg)
            }
        }
    }
}
