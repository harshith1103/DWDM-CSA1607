package com.shoplytics.app.presentation.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.DarkBg
import com.shoplytics.app.core.theme.PrimaryCyan
import com.shoplytics.app.core.theme.TextMuted
import com.shoplytics.app.domain.model.User
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    currentUser: User?,
    onNavigateNext: (targetRoute: String) -> Unit
) {
    LaunchedEffect(Unit) {
        delay(1800)
        val route = when (currentUser?.role?.lowercase()) {
            "customer" -> "home"
            "volunteer" -> "volunteer_portal"
            "admin" -> "admin_portal"
            else -> "welcome"
        }
        onNavigateNext(route)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Radar,
                contentDescription = "Shoplytics Logo",
                tint = PrimaryCyan,
                modifier = Modifier.size(84.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "SHOPLYTICS",
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "\"Shop Smarter. Understand Better.\"",
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(36.dp))
            CircularProgressIndicator(
                color = PrimaryCyan,
                modifier = Modifier.size(36.dp),
                strokeWidth = 3.dp
            )
        }
    }
}
