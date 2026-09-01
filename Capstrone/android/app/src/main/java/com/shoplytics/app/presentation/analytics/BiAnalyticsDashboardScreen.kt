package com.shoplytics.app.presentation.analytics

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*

@Composable
fun BiAnalyticsDashboardScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Business Intelligence & Analytics Hub", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Executive Data Warehouse KPIs & Sales Metrics", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(16.dp))

        // KPI Grid
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KpiCard("Total Revenue", "$140,500.00", PrimaryCyan, modifier = Modifier.weight(1f))
            KpiCard("Total Orders", "350", PrimaryIndigo, modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KpiCard("Avg Order Value", "$401.42", AccentEmerald, modifier = Modifier.weight(1f))
            KpiCard("Active Customers", "40", AccentAmber, modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Customer Data Mart Overview
        Text("👥 Customer Analytics Data Mart", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(10.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(10.dp)) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Top Customer: Alexander Smith", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                    Text("$4,250.00 Total Spent", fontSize = 12.sp, color = AccentEmerald, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text("Segment: Champions • 18 Orders • Fav: Electronics", fontSize = 11.sp, color = TextMuted)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Product Data Mart Overview
        Text("📦 Product Analytics Data Mart", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(10.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(10.dp)) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Top Product: Wireless Headphones", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("$29,998.50 Revenue", fontSize = 12.sp, color = PrimaryCyan, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text("150 Units Sold • 4.8 Rating • 0% Return Rate", fontSize = 11.sp, color = TextMuted)
            }
        }
    }
}

@Composable
fun KpiCard(title: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, fontSize = 12.sp, color = TextMuted)
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = accentColor)
        }
    }
}
