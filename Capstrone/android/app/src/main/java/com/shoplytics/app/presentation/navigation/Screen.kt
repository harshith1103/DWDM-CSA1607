package com.shoplytics.app.presentation.navigation

sealed class Screen(val route: String, val title: String) {
    object Splash : Screen("splash", "Splash")
    object Welcome : Screen("welcome", "Welcome")
    object Login : Screen("login", "Login")
    object AdminLogin : Screen("admin_login", "Admin Login")
    object Signup : Screen("signup", "Signup")
    object LocationPicker : Screen("location_picker", "Choose Delivery Location")
    object Home : Screen("home", "Home")
    object Catalog : Screen("catalog", "Store")
    object ProductDetail : Screen("product_detail/{productId}", "Product Details") {
        fun createRoute(productId: Int) = "product_detail/$productId"
    }
    object Cart : Screen("cart", "Cart")
    object Checkout : Screen("checkout", "Checkout")
    object Orders : Screen("orders", "My Orders")
    object OrderTracking : Screen("order_tracking/{orderId}", "Track Order") {
        fun createRoute(orderId: Int) = "order_tracking/$orderId"
    }
    object Apriori : Screen("apriori", "Apriori Mining")
    object Warehouse : Screen("warehouse", "Data Warehouse")
    object Olap : Screen("olap", "OLAP Engine")
    object BiAnalytics : Screen("analytics", "BI Analytics")
    object RfmSegmentation : Screen("segmentation", "RFM Customer Segments")
    object Reports : Screen("reports", "Reports & Export")
    object Admin : Screen("admin_portal", "Admin Control Hub")
    object Volunteer : Screen("volunteer_portal", "Volunteer Portal")
    object Notifications : Screen("notifications", "Notifications")
    object Profile : Screen("profile", "Profile")
    object Wishlist : Screen("wishlist", "Wishlist")
}
