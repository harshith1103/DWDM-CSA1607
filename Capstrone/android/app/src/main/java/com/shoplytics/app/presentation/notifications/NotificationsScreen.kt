package com.shoplytics.app.presentation.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.NotificationItem

@Composable
fun NotificationsScreen() {
    val notifications = remember {
        listOf(
            NotificationItem("1", "Order Confirmed & Assigned", "Order #ORD-2026-901 has been assigned to Alex Volunteer for delivery dispatch.", "order", "10 mins ago"),
            NotificationItem("2", "Apriori Rule Mining Completed", "Successfully generated 12 association rules across 350 transaction baskets.", "apriori", "1 hour ago"),
            NotificationItem("3", "Data Warehouse ETL Refresh", "Star schema dimension tables refreshed successfully.", "etl", "2 hours ago")
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("Notification Center", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(notifications) { item ->
                Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(10.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                            Text(item.timestamp, fontSize = 11.sp, color = TextMuted)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(item.message, fontSize = 12.sp, color = TextBright)
                    }
                }
            }
        }
    }
}
