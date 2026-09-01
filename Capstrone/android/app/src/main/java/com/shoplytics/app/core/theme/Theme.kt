package com.shoplytics.app.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryCyan,
    secondary = PrimaryIndigo,
    tertiary = AccentEmerald,
    background = DarkBg,
    surface = CardBg,
    onPrimary = DarkBg,
    onSecondary = TextBright,
    onBackground = TextBright,
    onSurface = TextBright,
    error = AccentRose
)

@Composable
fun ShoplyticsTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
