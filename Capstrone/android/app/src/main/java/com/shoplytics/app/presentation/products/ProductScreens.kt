package com.shoplytics.app.presentation.products

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import com.shoplytics.app.domain.model.ReviewStats
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductCatalogScreen(
    repository: ShoplyticsRepository,
    onNavigateDetail: (Int) -> Unit,
    onNavigateCart: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var categories by remember { mutableStateOf<List<String>>(listOf("All", "Electronics", "Home & Kitchen", "Fitness", "Fashion")) }
    var isLoading by remember { mutableStateOf(true) }
    var snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(selectedCategory, searchQuery) {
        isLoading = true
        val catFilter = if (selectedCategory == "All") null else selectedCategory
        val searchFilter = if (searchQuery.isBlank()) null else searchQuery
        repository.getProducts(catFilter, searchFilter).collect { res ->
            if (res.data != null) {
                products = res.data
            }
            isLoading = false
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = DarkBg
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Product Store", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Explore catalog & add items to cart", fontSize = 12.sp, color = TextMuted)
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

            Spacer(modifier = Modifier.height(14.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search products by name or brand...", fontSize = 12.sp, color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = PrimaryCyan) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear", tint = TextMuted)
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = CardBg,
                    unfocusedContainerColor = CardBg,
                    focusedBorderColor = PrimaryCyan
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Category Filter Pills
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat },
                        label = { Text(cat, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = PrimaryCyan,
                            selectedLabelColor = DarkBg
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PrimaryCyan)
                }
            } else if (products.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No products found.", color = TextMuted, fontSize = 14.sp)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(products) { product ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onNavigateDetail(product.productKey) },
                            colors = CardDefaults.cardColors(containerColor = CardBg),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(100.dp)
                                        .background(DarkBg, RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(product.imageURL, fontSize = 44.sp)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(product.brand, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                                Text(product.productName, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 2)
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("⭐ ${product.popularityRating}", fontSize = 10.sp, color = AccentAmber, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("(${product.stockQuantity} left)", fontSize = 9.sp, color = TextMuted)
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("₹${String.format("%.2f", product.price)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                                        if (product.originalPrice > product.price) {
                                            Text("₹${String.format("%.2f", product.originalPrice)}", fontSize = 9.sp, color = TextMuted)
                                        }
                                    }
                                    Button(
                                        onClick = {
                                            repository.addToCart(product)
                                            scope.launch {
                                                val result = snackbarHostState.showSnackbar(
                                                    message = "Added ${product.productName} to Cart!",
                                                    actionLabel = "VIEW CART",
                                                    duration = SnackbarDuration.Short
                                                )
                                                if (result == SnackbarResult.ActionPerformed) {
                                                    onNavigateCart()
                                                }
                                            }
                                        },
                                        modifier = Modifier.height(32.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Icon(Icons.Default.AddShoppingCart, contentDescription = null, tint = DarkBg, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("ADD", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = DarkBg)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    productId: Int,
    repository: ShoplyticsRepository,
    onBack: () -> Unit,
    onNavigateCart: () -> Unit
) {
    var product by remember { mutableStateOf<Product?>(null) }
    var reviewStats by remember { mutableStateOf<ReviewStats?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(productId) {
        repository.getProducts().collect { res ->
            if (res.data != null) {
                product = res.data.find { it.productKey == productId } ?: res.data.firstOrNull()
            }
        }
        repository.getReviews(productId).collect { res ->
            if (res.data != null) {
                reviewStats = res.data
            }
            isLoading = false
        }
    }

    val prod = product ?: Product(productId, "PROD-$productId", "Noise-Canceling Headphones", "Sony", "Electronics", 199.99, 249.99, 50.0, 95.0, 150, 4.8, "Industry leading noise cancellation.", "Battery: 30 Hrs", "🎧")

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
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                IconButton(onClick = { repository.toggleWishlist(prod.productKey) }) {
                    Icon(
                        imageVector = if (repository.isInWishlist(prod.productKey)) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Wishlist",
                        tint = if (repository.isInWishlist(prod.productKey)) Color.Red else Color.White
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(CardBg, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(prod.imageURL, fontSize = 90.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(prod.brand, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Text(prod.productName, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text(prod.category, fontSize = 12.sp, color = PrimaryCyan)
            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Star, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("${prod.popularityRating} / 5.0 (${reviewStats?.reviewCount ?: 28} Verified Customer Reviews)", fontSize = 12.sp, color = AccentAmber, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("₹${String.format("%.2f", prod.price)}", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                if (prod.originalPrice > prod.price) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("₹${String.format("%.2f", prod.originalPrice)}", fontSize = 16.sp, color = TextMuted)
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(color = AccentEmerald, shape = RoundedCornerShape(4.dp)) {
                        Text("SAVE ₹${String.format("%.2f", prod.originalPrice - prod.price)}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = DarkBg, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(prod.description.ifEmpty { "High-performance premium product designed with industry-leading quality and reliability." }, fontSize = 13.sp, color = TextMuted)

            if (prod.specifications.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text("🔧 Specifications: ${prod.specifications}", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Apriori Recommendation Explanation Banner
            Card(colors = CardDefaults.cardColors(containerColor = PrimaryCyan.copy(alpha = 0.1f)), shape = RoundedCornerShape(8.dp)) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("💡 Frequently Bought Together:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(prod.explanation ?: "Customers who purchased this also bought matching accessories.", fontSize = 12.sp, color = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    repository.addToCart(prod)
                    scope.launch {
                        val result = snackbarHostState.showSnackbar(
                            message = "Added ${prod.productName} to Cart!",
                            actionLabel = "VIEW CART",
                            duration = SnackbarDuration.Short
                        )
                        if (result == SnackbarResult.ActionPerformed) {
                            onNavigateCart()
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.AddShoppingCart, contentDescription = null, tint = DarkBg)
                Spacer(modifier = Modifier.width(8.dp))
                Text("ADD TO SHOPPING CART", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = DarkBg)
            }
        }
    }
}
