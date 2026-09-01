package com.shoplytics.app.presentation.warehouse

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*

@Composable
fun WarehouseArchitectureScreen() {
    var etlStatus by remember { mutableStateOf("Ready") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Data Warehouse Architecture & ETL Pipeline", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Star & Snowflake Schema Design", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(16.dp))

        // ETL Engine Control Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("ETL Pipeline Engine", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                        Text("Status: $etlStatus", fontSize = 12.sp, color = AccentEmerald)
                    }
                    Button(
                        onClick = { etlStatus = "Extracted ➔ Transformed ➔ Loaded 100%" },
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Trigger ETL", fontSize = 12.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Star Schema Overview
        Text("⭐ Star Schema Fact & Dimensions", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(10.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(10.dp)) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Central Fact Table: FactSales", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = AccentAmber)
                Text("Measures: Quantity, UnitPrice, Discount, TotalAmount", fontSize = 11.sp, color = TextMuted)
                Spacer(modifier = Modifier.height(10.dp))

                val dims = listOf("DimCustomer", "DimProduct", "DimDate", "DimBehavior")
                dims.forEach { dim ->
                    Text("• $dim (Dimension Table)", fontSize = 12.sp, color = PrimaryCyan)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Snowflake Schema Hierarchy
        Text("❄️ Snowflake Schema Normalized Hierarchy", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(10.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(10.dp)) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Product Hierarchy:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("DimProduct ➔ DimCategory ➔ DimSubcategory ➔ DimBrand", fontSize = 12.sp, color = TextMuted)

                Spacer(modifier = Modifier.height(10.dp))

                Text("Customer Location Hierarchy:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("DimCustomer ➔ DimLocation ➔ DimCity ➔ DimState ➔ DimCountry", fontSize = 12.sp, color = TextMuted)
            }
        }
    }
}
