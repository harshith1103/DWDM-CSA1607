package com.shoplytics.app.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
fun ProfileScreen(
    userName: String = "Demo Customer",
    email: String = "customer@gmail.com",
    role: String = "CUSTOMER",
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("My Profile & Customer Insights", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))

        // Profile Avatar Card
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(PrimaryIndigo, RoundedCornerShape(28.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(userName.take(1).uppercase(), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(userName, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text(email, fontSize = 12.sp, color = TextMuted)
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(color = PrimaryCyan.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                        Text(
                            role.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryCyan,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Personal Shopping Analytics Card
        Text("📊 Your Personal Shopping Insights", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(10.dp))

        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Customer Segment:", fontSize = 13.sp, color = TextMuted)
                    Text("🏆 Champions", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Favorite Category:", fontSize = 13.sp, color = TextMuted)
                    Text("Electronics", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total Purchases:", fontSize = 13.sp, color = TextMuted)
                    Text("18 Orders", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Average Order Value:", fontSize = 13.sp, color = TextMuted)
                    Text("$236.11", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentAmber)
                }
            }
        }

        Spacer(modifier = Modifier.height(30.dp))

        Button(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AccentRose)
        ) {
            Text("Sign Out", fontWeight = FontWeight.Bold)
        }
    }
}
