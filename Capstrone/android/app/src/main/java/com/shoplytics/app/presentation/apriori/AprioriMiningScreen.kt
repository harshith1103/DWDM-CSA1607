package com.shoplytics.app.presentation.apriori

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
import com.shoplytics.app.domain.model.AprioriRule

@Composable
fun AprioriMiningScreen() {
    var minSupport by remember { mutableStateOf(0.03f) }
    var minConfidence by remember { mutableStateOf(0.25f) }
    var minLift by remember { mutableStateOf(1.0f) }

    val rules = remember {
        listOf(
            AprioriRule(1, listOf("Wireless Headphones"), listOf("Smartwatch"), 0.08, 0.65, 2.14, "Strong", "Customers who purchase Wireless Headphones frequently purchase Smartwatches."),
            AprioriRule(2, listOf("Mechanical Keyboard"), listOf("Gaming Mouse"), 0.12, 0.78, 2.45, "Strong", "Customers who purchase Mechanical Keyboards frequently purchase Gaming Mice."),
            AprioriRule(3, listOf("Espresso Machine"), listOf("Coffee Bean Grinder"), 0.05, 0.72, 2.80, "Strong", "Customers who buy Espresso Machines frequently buy Coffee Grinders."),
            AprioriRule(4, listOf("Yoga Mat"), listOf("Resistance Bands"), 0.09, 0.58, 1.95, "Moderate", "Fitness customers who buy Yoga Mats frequently add Resistance Bands.")
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("Apriori Association Mining Engine", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Market Basket Analysis & Frequent Itemset Mining", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(16.dp))

        // Threshold Tuner Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Hyperparameter Configuration", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                Spacer(modifier = Modifier.height(12.dp))

                Text("Min Support: ${String.format("%.2f", minSupport)}", fontSize = 12.sp, color = TextMuted)
                Slider(value = minSupport, onValueChange = { minSupport = it }, valueRange = 0.01f..0.15f)

                Text("Min Confidence: ${String.format("%.2f", minConfidence)}", fontSize = 12.sp, color = TextMuted)
                Slider(value = minConfidence, onValueChange = { minConfidence = it }, valueRange = 0.10f..0.80f)

                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { /* Run mining */ },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                ) {
                    Text("⚡ Run Apriori Mining Engine", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("Mined Association Rules (${rules.size} Rules Mined)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(rules) { rule ->
                RuleCard(rule)
            }
        }
    }
}

@Composable
fun RuleCard(rule: AprioriRule) {
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
                Text(
                    text = "${rule.antecedents.joinToString(" + ")} ➔ ${rule.consequents.joinToString(" + ")}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = PrimaryCyan
                )
                Surface(
                    color = AccentEmerald.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = "Lift: ${String.format("%.2f", rule.lift)}x",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentEmerald,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Support: ${String.format("%.1f", rule.support * 100)}%", fontSize = 11.sp, color = TextMuted)
                Text("Confidence: ${String.format("%.1f", rule.confidence * 100)}%", fontSize = 11.sp, color = TextMuted)
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "💡 ${rule.explanation}",
                fontSize = 12.sp,
                color = TextBright
            )
        }
    }
}
