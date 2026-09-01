package com.shoplytics.app.presentation.reports

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*

@Composable
fun ReportsScreen() {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("Report Generation & Data Export", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Automated PDF Reports & Excel Data Warehousing Exports", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(20.dp))

        // PDF Executive Report
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("📄 Executive PDF Analytics Report", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Generates complete Data Warehouse, Apriori Rules & Sales Report", fontSize = 12.sp, color = TextMuted)
                Spacer(modifier = Modifier.height(14.dp))
                Button(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("http://10.0.2.2:3000/api/reports/pdf"))
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentRose)
                ) {
                    Text("Generate & Download PDF Report", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Excel / CSV Export
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("📊 Excel / CSV Warehouse Export", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Exports FactSales, DimCustomer & Apriori Rules dataset to Excel", fontSize = 12.sp, color = TextMuted)
                Spacer(modifier = Modifier.height(14.dp))
                Button(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("http://10.0.2.2:3000/api/reports/excel"))
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald)
                ) {
                    Text("Export Excel Data File (.xlsx)", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
