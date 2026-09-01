package com.shoplytics.app.presentation.segmentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.CustomerSegment

@Composable
fun RfmSegmentationScreen() {
    val segments = remember {
        listOf(
            CustomerSegment("CUST-1001", "Alexander Smith", 4, 18, 4250.0, "Champions", 5.0, 95.0),
            CustomerSegment("CUST-1002", "Sophia Johnson", 12, 11, 2800.0, "Loyal Customers", 12.0, 85.0),
            CustomerSegment("CUST-1003", "Ethan Williams", 28, 6, 1450.0, "Potential Loyalists", 24.0, 70.0),
            CustomerSegment("CUST-1004", "Emma Brown", 65, 2, 420.0, "At Risk", 68.0, 30.0),
            CustomerSegment("CUST-1005", "Liam Jones", 110, 1, 150.0, "Lost Customers", 88.0, 10.0)
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("Customer RFM Segmentation & Predictive ML", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Recency, Frequency, Monetary Score Clustering & Churn Alerts", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(segments) { cust ->
                SegmentCard(cust)
            }
        }
    }
}

@Composable
fun SegmentCard(cust: CustomerSegment) {
    val (badgeColor, badgeText) = when (cust.rfmSegment) {
        "Champions" -> PrimaryCyan to "🏆 Champions"
        "Loyal Customers" -> PrimaryIndigo to "💎 Loyal Customers"
        "Potential Loyalists" -> AccentEmerald to "📈 Potential Loyalists"
        "At Risk" -> AccentAmber to "⚠️ At Risk"
        else -> AccentRose to "🚨 Lost Customer"
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(cust.fullName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Surface(color = badgeColor.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                    Text(
                        badgeText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = badgeColor,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Recency: ${cust.recencyDays} days", fontSize = 11.sp, color = TextMuted)
                Text("Frequency: ${cust.frequencyCount} txns", fontSize = 11.sp, color = TextMuted)
                Text("Monetary: $${String.format("%.0f", cust.monetaryTotal)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Churn Risk: ${cust.churnRiskPercent}%", fontSize = 11.sp, color = if (cust.churnRiskPercent > 50) AccentRose else AccentEmerald)
                Text("Purchase Likelihood: ${cust.purchaseLikelihoodPercent}%", fontSize = 11.sp, color = PrimaryCyan, fontWeight = FontWeight.Bold)
            }
        }
    }
}
