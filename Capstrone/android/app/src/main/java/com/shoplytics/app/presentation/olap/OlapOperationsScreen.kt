package com.shoplytics.app.presentation.olap

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.OlapRow

@Composable
fun OlapOperationsScreen() {
    var activeOp by remember { mutableStateOf("ROLLUP") }

    val data = remember(activeOp) {
        when (activeOp) {
            "ROLLUP" -> listOf(
                OlapRow("Year 2025", 210, 84500.0, 310),
                OlapRow("Year 2026", 140, 56000.0, 190)
            )
            "DRILLDOWN" -> listOf(
                OlapRow("2026 - January", 35, 14200.0, 48),
                OlapRow("2026 - February", 38, 15100.0, 52),
                OlapRow("2026 - March", 42, 16800.0, 58),
                OlapRow("2026 - April", 25, 9900.0, 32)
            )
            "SLICE" -> listOf(
                OlapRow("Noise-Canceling Headphones", 45, 8999.55, 45),
                OlapRow("Pro Smartwatch Series 7", 30, 8999.70, 30),
                OlapRow("Mechanical Keyboard", 45, 5849.55, 45)
            )
            "DICE" -> listOf(
                OlapRow("Electronics | North America", 65, 28500.0, 85),
                OlapRow("Electronics | Europe", 40, 17400.0, 55),
                OlapRow("Home & Kitchen | Asia-Pacific", 35, 12800.0, 48)
            )
            else -> listOf( // PIVOT
                OlapRow("Electronics", 0, 45900.0, 0, 10000.0, 11000.0, 12000.0, 12900.0),
                OlapRow("Home & Kitchen", 0, 28400.0, 0, 6000.0, 7000.0, 7500.0, 7900.0),
                OlapRow("Fitness", 0, 14500.0, 0, 3000.0, 3500.0, 3800.0, 4200.0)
            )
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("OLAP Data Cube Operations Engine", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Star Schema Dimensional Analytics", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(16.dp))

        // Operation Selector Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val ops = listOf("ROLLUP", "DRILLDOWN", "SLICE", "DICE", "PIVOT")
            ops.forEach { op ->
                Button(
                    onClick = { activeOp = op },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (activeOp == op) PrimaryCyan else CardBg
                    ),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(4.dp)
                ) {
                    Text(op, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("Operation Output: $activeOp", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(data) { row ->
                OlapDataCard(row, activeOp)
            }
        }
    }
}

@Composable
fun OlapDataCard(row: OlapRow, op: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(row.dimension, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(6.dp))

            if (op == "PIVOT") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Q1: $${String.format("%.0f", row.q1Revenue)}", fontSize = 11.sp, color = TextMuted)
                    Text("Q2: $${String.format("%.0f", row.q2Revenue)}", fontSize = 11.sp, color = TextMuted)
                    Text("Q3: $${String.format("%.0f", row.q3Revenue)}", fontSize = 11.sp, color = TextMuted)
                    Text("Q4: $${String.format("%.0f", row.q4Revenue)}", fontSize = 11.sp, color = TextMuted)
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Orders: ${row.totalOrders}", fontSize = 12.sp, color = TextMuted)
                    Text("Units: ${row.totalUnits}", fontSize = 12.sp, color = TextMuted)
                    Text("Revenue: $${String.format("%.2f", row.totalRevenue)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
                }
            }
        }
    }
}
