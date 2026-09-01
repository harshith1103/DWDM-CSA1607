package com.shoplytics.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.shoplytics.app.core.theme.CardBg
import com.shoplytics.app.core.theme.PrimaryCyan
import com.shoplytics.app.core.theme.ShoplyticsTheme
import com.shoplytics.app.core.theme.TextMuted
import com.shoplytics.app.data.repository.ShoplyticsRepository
import com.shoplytics.app.presentation.navigation.Screen
import com.shoplytics.app.presentation.navigation.SetupNavGraph

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShoplyticsTheme {
                MainAppScreen()
            }
        }
    }
}

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen() {
    val navController = rememberNavController()
    val repository = remember { ShoplyticsRepository() }
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val role = repository.currentUser?.role?.lowercase() ?: "customer"

    val customerNavItems = listOf(
        BottomNavItem(Screen.Home.route, "Home", Icons.Default.Home),
        BottomNavItem(Screen.Catalog.route, "Store", Icons.Default.Storefront),
        BottomNavItem(Screen.Cart.route, "Cart", Icons.Default.ShoppingCart),
        BottomNavItem(Screen.Orders.route, "Orders", Icons.Default.ShoppingBag),
        BottomNavItem(Screen.Profile.route, "Profile", Icons.Default.Person)
    )

    val volunteerNavItems = listOf(
        BottomNavItem(Screen.Volunteer.route, "Tasks", Icons.Default.TwoWheeler),
        BottomNavItem(Screen.Profile.route, "Profile", Icons.Default.Person)
    )

    val adminNavItems = listOf(
        BottomNavItem(Screen.Admin.route, "Hub", Icons.Default.AdminPanelSettings),
        BottomNavItem(Screen.BiAnalytics.route, "BI Hub", Icons.Default.BarChart),
        BottomNavItem(Screen.Apriori.route, "Apriori", Icons.Default.AutoGraph),
        BottomNavItem(Screen.Olap.route, "OLAP", Icons.Default.ViewInAr),
        BottomNavItem(Screen.Warehouse.route, "Warehouse", Icons.Default.Storage)
    )

    val bottomNavItems = when (role) {
        "admin" -> adminNavItems
        "volunteer" -> volunteerNavItems
        else -> customerNavItems
    }

    val hideBottomBar = currentRoute in listOf(
        Screen.Splash.route,
        Screen.Welcome.route,
        Screen.Login.route,
        Screen.AdminLogin.route,
        Screen.Signup.route,
        Screen.LocationPicker.route
    )

    Scaffold(
        bottomBar = {
            if (!hideBottomBar) {
                NavigationBar(
                    containerColor = CardBg
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = item.label,
                                    tint = if (selected) PrimaryCyan else TextMuted
                                )
                            },
                            label = {
                                Text(
                                    text = item.label,
                                    color = if (selected) PrimaryCyan else TextMuted
                                )
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier.padding(innerPadding)
        ) {
            SetupNavGraph(navController = navController, repository = repository)
        }
    }
}
