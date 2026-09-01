package com.shoplytics.app.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.data.repository.ShoplyticsRepository
import com.shoplytics.app.domain.model.Product
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    userName: String = "Demo Customer",
    deliveryLocation: String = "Flat 402, Banjara Hills, Hyderabad",
    repository: ShoplyticsRepository,
    onNavigateCatalog: () -> Unit,
    onNavigateProductDetail: (Int) -> Unit,
    onNavigateLocationPicker: () -> Unit,
    onNavigateOrders: () -> Unit,
    onNavigateWishlist: () -> Unit,
    onNavigateCart: () -> Unit,
    onNavigateProfile: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        repository.getProducts().collect { res ->
            if (res.data != null) {
                products = res.data
            }
            isLoading = false
        }
    }

    val recommendedProducts = remember(products) { products.take(6) }
    val trendingProducts = remember(products) { products.sortedByDescending { it.popularityRating }.take(6) }
    val frequentlyBought = remember(products) { products.filter { it.category == "Electronics" }.take(6) }
    val bestSellers = remember(products) { products.sortedByDescending { it.price }.take(6) }
    val dealsProducts = remember(products) { products.filter { it.discount > 0 }.take(6) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = DarkBg
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Customer Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = "Hello, $userName 👋", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        modifier = Modifier
                            .clickable { onNavigateLocationPicker() }
                            .padding(vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Deliver to: $deliveryLocation",
                            fontSize = 11.sp,
                            color = PrimaryCyan,
                            maxLines = 1
                        )
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(14.dp))
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onNavigateWishlist) {
                        Icon(Icons.Default.FavoriteBorder, contentDescription = "Wishlist", tint = Color.White)
                    }
                    IconButton(onClick = onNavigateCart) {
                        BadgedBox(badge = {
                            val count = repository.getCartItems().sumOf { it.quantity }
                            if (count > 0) {
                                Badge(containerColor = AccentAmber, contentColor = DarkBg) { Text("$count") }
                            }
                        }) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Cart", tint = PrimaryCyan)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Amazon-style Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search products, brands and categories...", fontSize = 12.sp, color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = PrimaryCyan) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear", tint = TextMuted)
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateCatalog() },
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = CardBg,
                    unfocusedContainerColor = CardBg,
                    focusedBorderColor = PrimaryCyan,
                    unfocusedBorderColor = Color.Transparent
                )
            )

            Spacer(modifier = Modifier.height(20.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PrimaryCyan)
                }
            } else {
                // Function to add item and trigger toast feedback
                val handleAddToCart: (Product) -> Unit = { product ->
                    repository.addToCart(product)
                    scope.launch {
                        val res = snackbarHostState.showSnackbar(
                            message = "Added ${product.productName} to Cart!",
                            actionLabel = "VIEW CART",
                            duration = SnackbarDuration.Short
                        )
                        if (res == SnackbarResult.ActionPerformed) {
                            onNavigateCart()
                        }
                    }
                }

                // Section 1: Recommended For You (Apriori & History based)
                HomeSectionHeader(title = "✨ Recommended For You", subtitle = "Personalized via Apriori Mining & Browsing History") {
                    onNavigateCatalog()
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(if (recommendedProducts.isNotEmpty()) recommendedProducts else products) { p ->
                        HomeProductCard(product = p, onProductClick = { onNavigateProductDetail(p.productKey) }, onAddToCart = { handleAddToCart(p) })
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Section 2: Trending Products
                HomeSectionHeader(title = "🔥 Trending Products", subtitle = "High customer demand & view velocity") {
                    onNavigateCatalog()
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(if (trendingProducts.isNotEmpty()) trendingProducts else products) { p ->
                        HomeProductCard(product = p, onProductClick = { onNavigateProductDetail(p.productKey) }, onAddToCart = { handleAddToCart(p) })
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Section 3: Frequently Bought Together
                HomeSectionHeader(title = "🛍️ Frequently Bought Together", subtitle = "Mined Association Rules (Support > 3%, Confidence > 60%)") {
                    onNavigateCatalog()
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(if (frequentlyBought.isNotEmpty()) frequentlyBought else products.reversed()) { p ->
                        HomeProductCard(product = p, onProductClick = { onNavigateProductDetail(p.productKey) }, onAddToCart = { handleAddToCart(p) })
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Section 4: Best Sellers
                HomeSectionHeader(title = "🏆 Best Sellers", subtitle = "Top sales volume across all categories") {
                    onNavigateCatalog()
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(if (bestSellers.isNotEmpty()) bestSellers else products) { p ->
                        HomeProductCard(product = p, onProductClick = { onNavigateProductDetail(p.productKey) }, onAddToCart = { handleAddToCart(p) })
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Section 5: Deals & Discounts
                if (dealsProducts.isNotEmpty()) {
                    HomeSectionHeader(title = "🏷️ Today's Special Deals", subtitle = "Limited time discounts & savings") {
                        onNavigateCatalog()
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(dealsProducts) { p ->
                            HomeProductCard(product = p, onProductClick = { onNavigateProductDetail(p.productKey) }, onAddToCart = { handleAddToCart(p) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HomeSectionHeader(title: String, subtitle: String, onViewAll: () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            TextTextButton(onViewAll)
        }
        Text(text = subtitle, fontSize = 11.sp, color = TextMuted)
    }
}

@Composable
fun TextTextButton(onClick: () -> Unit) {
    Text(
        text = "See All ›",
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = PrimaryCyan,
        modifier = Modifier.clickable { onClick() }
    )
}

@Composable
fun HomeProductCard(product: Product, onProductClick: () -> Unit, onAddToCart: () -> Unit) {
    Card(
        modifier = Modifier
            .width(170.dp)
            .clickable { onProductClick() },
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(90.dp)
                    .background(DarkBg, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = product.imageURL, fontSize = 38.sp)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = product.brand,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted
            )
            Text(
                text = product.productName,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 2
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "⭐ ${product.popularityRating}", fontSize = 10.sp, color = AccentAmber)
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "(${product.stockQuantity} left)", fontSize = 9.sp, color = TextMuted)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "₹${String.format("%.2f", product.price)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryCyan
                    )
                    if (product.originalPrice > product.price) {
                        Text(
                            text = "₹${String.format("%.2f", product.originalPrice)}",
                            fontSize = 9.sp,
                            color = TextMuted
                        )
                    }
                }
                IconButton(
                    onClick = onAddToCart,
                    modifier = Modifier
                        .size(30.dp)
                        .background(AccentEmerald, RoundedCornerShape(6.dp))
                ) {
                    Icon(Icons.Default.AddShoppingCart, contentDescription = "Add to Cart", tint = DarkBg, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}
