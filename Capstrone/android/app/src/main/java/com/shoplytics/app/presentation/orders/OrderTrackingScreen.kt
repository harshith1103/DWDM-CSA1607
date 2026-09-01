package com.shoplytics.app.presentation.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import com.shoplytics.app.domain.model.DeliveryTrackingInfo
import com.shoplytics.app.domain.model.Order

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(
    order: Order,
    trackingInfo: DeliveryTrackingInfo?,
    onBack: () -> Unit
) {
    val statuses = listOf("ORDER PLACED", "CONFIRMED", "PACKED", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED")
    val currentStatusIdx = remember(order.status) {
        when (order.status.uppercase()) {
            "ORDER PLACED" -> 0
            "CONFIRMED" -> 1
            "PACKED" -> 2
            "SHIPPED" -> 3
            "OUT FOR DELIVERY" -> 4
            "DELIVERED" -> 5
            else -> 0
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Track Order #${order.orderNumber}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White) },
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
            // Live Map View Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = AccentEmerald, modifier = Modifier.size(36.dp))
                                Text("Volunteer", fontSize = 10.sp, color = AccentEmerald, fontWeight = FontWeight.Bold)
                            }
                            Text("➔ 🚴 ➔ 📦 ➔", fontSize = 14.sp, color = PrimaryCyan)
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Home, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(36.dp))
                                Text("Customer", fontSize = 10.sp, color = PrimaryCyan, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Live Google Maps Route Tracking",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        trackingInfo?.let {
                            Text(
                                text = "Agent: ${it.volunteerName} (${it.volunteerPhone})",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Order Status Timeline Progress Bar
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Delivery Timeline Progress", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(16.dp))

                    statuses.forEachIndexed { idx, st ->
                        val isDone = idx <= currentStatusIdx
                        val isCurrent = idx == currentStatusIdx

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .background(
                                        when {
                                            isCurrent -> PrimaryCyan
                                            isDone -> AccentEmerald
                                            else -> DarkBg
                                        },
                                        CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isDone) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = DarkBg, modifier = Modifier.size(14.dp))
                                } else {
                                    Text("${idx + 1}", fontSize = 10.sp, color = TextMuted)
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Text(
                                    text = st,
                                    fontSize = 13.sp,
                                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isDone) Color.White else TextMuted
                                )
                                if (isCurrent) {
                                    Text("Active Stage - Delivery in Progress", fontSize = 10.sp, color = PrimaryCyan)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Order Summary Details
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Delivery Address:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = order.shippingAddress, fontSize = 13.sp, color = Color.White)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(text = "Payment Method:", fontSize = 12.sp, color = TextMuted)
                        Text(text = "${order.paymentMethod} (${order.paymentStatus})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(text = "Total Amount Paid:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text(text = "₹${String.format("%.2f", order.totalAmount)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
                    }
                }
            }
        }
    }
}
