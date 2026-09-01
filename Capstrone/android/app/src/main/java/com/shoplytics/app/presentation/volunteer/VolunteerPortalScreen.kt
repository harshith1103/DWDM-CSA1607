package com.shoplytics.app.presentation.volunteer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.shoplytics.app.domain.model.Order
import com.shoplytics.app.domain.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VolunteerPortalScreen(
    user: User,
    deliveries: List<Order>,
    onUpdateStatus: (orderId: Int, newStatus: String) -> Unit,
    onSendLocationUpdate: (orderId: Int, lat: Double, lng: Double) -> Unit,
    onLogout: () -> Unit
) {
    var isOnline by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }

    val activeDeliveries = remember(deliveries) {
        deliveries.filter { it.status in listOf("Assigned", "SHIPPED", "OUT FOR DELIVERY", "In Transit") }
    }
    val completedDeliveries = remember(deliveries) {
        deliveries.filter { it.status == "DELIVERED" }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Volunteer Logistics Portal", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text(user.fullName, fontSize = 11.sp, color = TextMuted)
                    }
                },
                actions = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(if (isOnline) "ONLINE" else "OFFLINE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (isOnline) AccentEmerald else TextMuted)
                        Spacer(modifier = Modifier.width(4.dp))
                        Switch(
                            checked = isOnline,
                            onCheckedChange = { isOnline = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = AccentEmerald)
                        )
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Logout", tint = Color.White)
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
        ) {
            // Status Tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = CardBg,
                contentColor = PrimaryCyan
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Active Tasks (${activeDeliveries.size})", fontSize = 12.sp) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Completed (${completedDeliveries.size})", fontSize = 12.sp) }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            val currentList = if (selectedTab == 0) activeDeliveries else completedDeliveries

            if (currentList.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = TextMuted, modifier = Modifier.size(54.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("No deliveries in this section.", fontSize = 14.sp, color = TextMuted)
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(currentList) { order ->
                        VolunteerDeliveryCard(
                            order = order,
                            onStartDelivery = {
                                onUpdateStatus(order.orderId, "OUT FOR DELIVERY")
                                onSendLocationUpdate(order.orderId, 17.4140, 78.4485)
                            },
                            onMarkDelivered = {
                                onUpdateStatus(order.orderId, "DELIVERED")
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun VolunteerDeliveryCard(
    order: Order,
    onStartDelivery: () -> Unit,
    onMarkDelivered: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "Order #${order.orderNumber}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                Surface(
                    color = when (order.status.uppercase()) {
                        "OUT FOR DELIVERY", "IN TRANSIT" -> AccentAmber
                        "DELIVERED" -> AccentEmerald
                        else -> PrimaryIndigo
                    },
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = order.status,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = DarkBg,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text("👤 Receiver: ${order.customerName}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("📍 Delivery Address: ${order.shippingAddress}", fontSize = 12.sp, color = TextMuted)
            Text("🏬 Pickup Depot: ${order.collectionAddress}", fontSize = 11.sp, color = TextMuted)
            Text("💵 Amount to Collect: ₹${String.format("%.2f", order.totalAmount)} (${order.paymentMethod})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)

            Spacer(modifier = Modifier.height(12.dp))

            if (order.status in listOf("Assigned", "SHIPPED", "CONFIRMED")) {
                Button(
                    onClick = onStartDelivery,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentAmber)
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, tint = DarkBg, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("START DELIVERY (OUT FOR DELIVERY)", fontWeight = FontWeight.Bold, color = DarkBg, fontSize = 12.sp)
                }
            } else if (order.status in listOf("OUT FOR DELIVERY", "In Transit")) {
                Button(
                    onClick = onMarkDelivered,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = DarkBg, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("MARK AS DELIVERED", fontWeight = FontWeight.Bold, color = DarkBg, fontSize = 12.sp)
                }
            }
        }
    }
}
