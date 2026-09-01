package com.shoplytics.app.presentation.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.shoplytics.app.data.repository.ShoplyticsRepository
import com.shoplytics.app.domain.model.Address
import com.shoplytics.app.domain.model.Order
import com.shoplytics.app.domain.model.VolunteerInfo
import com.shoplytics.app.presentation.admin.AdminPortalScreen
import com.shoplytics.app.presentation.analytics.BiAnalyticsDashboardScreen
import com.shoplytics.app.presentation.apriori.AprioriMiningScreen
import com.shoplytics.app.presentation.auth.AdminLoginScreen
import com.shoplytics.app.presentation.auth.LoginScreen
import com.shoplytics.app.presentation.auth.SignupScreen
import com.shoplytics.app.presentation.auth.WelcomeScreen
import com.shoplytics.app.presentation.cart.CartScreen
import com.shoplytics.app.presentation.checkout.CheckoutScreen
import com.shoplytics.app.presentation.home.HomeScreen
import com.shoplytics.app.presentation.location.LocationPickerScreen
import com.shoplytics.app.presentation.notifications.NotificationsScreen
import com.shoplytics.app.presentation.olap.OlapOperationsScreen
import com.shoplytics.app.presentation.orders.OrderHistoryScreen
import com.shoplytics.app.presentation.orders.OrderTrackingScreen
import com.shoplytics.app.presentation.products.ProductCatalogScreen
import com.shoplytics.app.presentation.products.ProductDetailScreen
import com.shoplytics.app.presentation.profile.ProfileScreen
import com.shoplytics.app.presentation.reports.ReportsScreen
import com.shoplytics.app.presentation.segmentation.RfmSegmentationScreen
import com.shoplytics.app.presentation.splash.SplashScreen
import com.shoplytics.app.presentation.volunteer.VolunteerPortalScreen
import com.shoplytics.app.presentation.warehouse.WarehouseArchitectureScreen
import kotlinx.coroutines.launch

@Composable
fun SetupNavGraph(
    navController: NavHostController,
    repository: ShoplyticsRepository = remember { ShoplyticsRepository() }
) {
    val coroutineScope = rememberCoroutineScope()
    var selectedDeliveryAddress by remember { mutableStateOf<Address?>(null) }
    var volunteerDeliveries by remember { mutableStateOf<List<Order>>(emptyList()) }
    var adminVolunteers by remember { mutableStateOf<List<VolunteerInfo>>(emptyList()) }
    var adminOrders by remember { mutableStateOf<List<Order>>(emptyList()) }

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                currentUser = repository.currentUser,
                onNavigateNext = { targetRoute ->
                    navController.navigate(targetRoute) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Welcome.route) {
            WelcomeScreen(
                onNavigateLogin = { navController.navigate(Screen.Login.route) },
                onNavigateSignup = { navController.navigate(Screen.Signup.route) },
                onNavigateCustomerLogin = { navController.navigate(Screen.Home.route) },
                onNavigateVolunteerLogin = { navController.navigate(Screen.Volunteer.route) },
                onNavigateAdminLogin = { navController.navigate(Screen.AdminLogin.route) }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSubmit = { email, pass, onComplete ->
                    coroutineScope.launch {
                        repository.login(email, pass).collect { res ->
                            if (res.data != null) {
                                onComplete(res.data, null)
                            } else if (res.message != null) {
                                onComplete(null, res.message)
                            }
                        }
                    }
                },
                onNavigateSignup = { navController.navigate(Screen.Signup.route) },
                onNavigateAdminLogin = { navController.navigate(Screen.AdminLogin.route) },
                onLoginSuccess = { user ->
                    val nextRoute = when (user.role.lowercase()) {
                        "admin" -> Screen.Admin.route
                        "volunteer" -> Screen.Volunteer.route
                        else -> Screen.Home.route
                    }
                    navController.navigate(nextRoute) {
                        popUpTo(Screen.Welcome.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.AdminLogin.route) {
            AdminLoginScreen(
                onAdminLoginSubmit = { email, pass, onComplete ->
                    coroutineScope.launch {
                        repository.adminLogin(email, pass).collect { res ->
                            if (res.data != null) {
                                onComplete(res.data, null)
                            } else if (res.message != null) {
                                onComplete(null, res.message)
                            }
                        }
                    }
                },
                onBackToCustomerLogin = { navController.popBackStack() },
                onAdminLoginSuccess = { adminUser ->
                    navController.navigate(Screen.Admin.route) {
                        popUpTo(Screen.Welcome.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Signup.route) {
            SignupScreen(
                onSignupSubmit = { name, email, pass, phone, role, loc, onComplete ->
                    coroutineScope.launch {
                        repository.register(email, pass, name, phone, role, loc).collect { res ->
                            if (res.data != null) {
                                onComplete(true, res.data)
                            } else {
                                onComplete(false, res.message)
                            }
                        }
                    }
                },
                onNavigateLogin = { navController.navigate(Screen.Login.route) },
                onNavigateLocationPicker = { navController.navigate(Screen.LocationPicker.route) },
                selectedLocationAddress = selectedDeliveryAddress?.let { "${it.houseFlat}, ${it.street}, ${it.city}" }
            )
        }

        composable(Screen.LocationPicker.route) {
            LocationPickerScreen(
                onConfirmLocation = { address ->
                    selectedDeliveryAddress = address
                    coroutineScope.launch { repository.saveAddress(address) }
                    navController.popBackStack()
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                userName = repository.currentUser?.fullName ?: "Demo Customer",
                deliveryLocation = selectedDeliveryAddress?.let { "${it.houseFlat}, ${it.area}" } ?: "Flat 402, Banjara Hills, Hyderabad",
                repository = repository,
                onNavigateCatalog = { navController.navigate(Screen.Catalog.route) },
                onNavigateProductDetail = { id -> navController.navigate(Screen.ProductDetail.createRoute(id)) },
                onNavigateLocationPicker = { navController.navigate(Screen.LocationPicker.route) },
                onNavigateOrders = { navController.navigate(Screen.Orders.route) },
                onNavigateWishlist = { navController.navigate(Screen.Wishlist.route) },
                onNavigateCart = { navController.navigate(Screen.Cart.route) },
                onNavigateProfile = { navController.navigate(Screen.Profile.route) }
            )
        }

        composable(Screen.Catalog.route) {
            ProductCatalogScreen(
                onNavigateDetail = { id -> navController.navigate(Screen.ProductDetail.createRoute(id)) },
                onAddToCart = { product -> repository.addToCart(product) }
            )
        }

        composable(Screen.ProductDetail.route) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId")?.toIntOrNull() ?: 1
            ProductDetailScreen(
                productId = productId,
                onBack = { navController.popBackStack() },
                onAddToCart = { product -> repository.addToCart(product) }
            )
        }

        composable(Screen.Cart.route) {
            CartScreen(
                cartItems = repository.getCartItems(),
                onRemoveItem = { key -> repository.removeFromCart(key) },
                onNavigateCheckout = { navController.navigate(Screen.Checkout.route) }
            )
        }

        composable(Screen.Checkout.route) {
            CheckoutScreen(
                totalAmount = repository.getCartTotal(),
                onOrderConfirmed = {
                    repository.clearCart()
                    navController.navigate(Screen.Orders.route) {
                        popUpTo(Screen.Cart.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Orders.route) {
            OrderHistoryScreen()
        }

        composable(Screen.Volunteer.route) {
            VolunteerPortalScreen(
                user = repository.currentUser ?: com.shoplytics.app.domain.model.User(1, "volunteer@gmail.com", "volunteer", "Alex Delivery Agent"),
                deliveries = volunteerDeliveries,
                onUpdateStatus = { orderId, newStatus -> },
                onSendLocationUpdate = { orderId, lat, lng -> },
                onLogout = {
                    repository.currentUser = null
                    navController.navigate(Screen.Welcome.route) { popUpTo(0) { inclusive = true } }
                }
            )
        }

        composable(Screen.Admin.route) {
            AdminPortalScreen(
                adminUser = repository.currentUser ?: com.shoplytics.app.domain.model.User(1, "admin@gmail.com", "admin", "System Administrator"),
                volunteersList = adminVolunteers,
                ordersList = adminOrders,
                onApproveVolunteer = { userId -> },
                onAssignVolunteer = { orderId, volId -> },
                onNavigateApriori = { navController.navigate(Screen.Apriori.route) },
                onNavigateOlap = { navController.navigate(Screen.Olap.route) },
                onNavigateWarehouse = { navController.navigate(Screen.Warehouse.route) },
                onNavigateAnalytics = { navController.navigate(Screen.BiAnalytics.route) },
                onNavigateRfm = { navController.navigate(Screen.RfmSegmentation.route) },
                onNavigateReports = { navController.navigate(Screen.Reports.route) },
                onLogout = {
                    repository.currentUser = null
                    navController.navigate(Screen.Welcome.route) { popUpTo(0) { inclusive = true } }
                }
            )
        }

        composable(Screen.Apriori.route) {
            AprioriMiningScreen()
        }

        composable(Screen.Olap.route) {
            OlapOperationsScreen()
        }

        composable(Screen.Warehouse.route) {
            WarehouseArchitectureScreen()
        }

        composable(Screen.BiAnalytics.route) {
            BiAnalyticsDashboardScreen()
        }

        composable(Screen.RfmSegmentation.route) {
            RfmSegmentationScreen()
        }

        composable(Screen.Reports.route) {
            ReportsScreen()
        }

        composable(Screen.Notifications.route) {
            NotificationsScreen()
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                userName = repository.currentUser?.fullName ?: "Demo Customer",
                email = repository.currentUser?.email ?: "customer@gmail.com",
                role = repository.currentUser?.role ?: "CUSTOMER",
                onLogout = {
                    repository.currentUser = null
                    navController.navigate(Screen.Welcome.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
