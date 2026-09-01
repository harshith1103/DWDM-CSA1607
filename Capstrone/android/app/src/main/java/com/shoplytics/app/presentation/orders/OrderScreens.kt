package com.shoplytics.app.presentation.orders

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.Order
import com.shoplytics.app.domain.model.OrderItem

@Composable
fun OrderHistoryScreen() {
    val context = LocalContext.current

    val orders = remember {
        listOf(
            Order(
                orderId = 101,
                orderNumber = "ORD-2026-901",
                customerKey = 1,
                customerName = "Demo Customer",
                shippingAddress = "742 Evergreen Terrace, Sector 5, Metro City",
                status = "In Transit",
                volunteerName = "Alex Delivery Volunteer",
                totalAmount = 199.99,
                createdAt = "2026-08-19 22:30",
                items = listOf(OrderItem(1, 1, "Noise-Canceling Headphones", "🎧", 1, 199.99))
            ),
            Order(
                orderId = 102,
                orderNumber = "ORD-2026-902",
                customerKey = 1,
                customerName = "Demo Customer",
                shippingAddress = "104 Baker Street, Suite 4B, Downtown",
                status = "Delivered",
                volunteerName = "Alex Delivery Volunteer",
                totalAmount = 249.99,
                createdAt = "2026-08-18 14:15",
                items = listOf(OrderItem(2, 4, "Italian Espresso Coffee Machine", "☕", 1, 249.99))
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("My Orders & Live Logistics Tracking", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(orders) { order ->
                Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(order.orderNumber, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                            Surface(color = PrimaryIndigo.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                                Text(
                                    order.status,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = PrimaryIndigo,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text("📍 Address: ${order.shippingAddress}", fontSize = 12.sp, color = TextMuted)
                        Text("🚚 Volunteer: ${order.volunteerName ?: "Assigning..."}", fontSize = 12.sp, color = PrimaryCyan)
                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Total: $${String.format("%.2f", order.totalAmount)}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)

                            Button(
                                onClick = {
                                    val gmapsUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(order.shippingAddress)}")
                                    val mapIntent = Intent(Intent.ACTION_VIEW, gmapsUri)
                                    context.startActivity(mapIntent)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                            ) {
                                Text("🗺️ Track Google Maps", fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
