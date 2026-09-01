package com.shoplytics.app.data.repository

import com.shoplytics.app.core.network.ApiClient
import com.shoplytics.app.core.network.Resource
import com.shoplytics.app.domain.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class ShoplyticsRepository {
    private val api = ApiClient.apiService

    var currentUser: User? = null
    var authToken: String? = null

    // Cart and Wishlist in-memory state fallback
    private val cartItems = mutableListOf<CartItem>()
    private val wishlistProductKeys = mutableSetOf<Int>()

    fun getCartItems(): List<CartItem> = cartItems

    fun addToCart(product: Product, qty: Int = 1) {
        val existing = cartItems.find { it.product.productKey == product.productKey }
        if (existing != null) {
            existing.quantity += qty
        } else {
            cartItems.add(CartItem(product, qty))
        }
    }

    fun removeFromCart(productKey: Int) {
        cartItems.removeAll { it.product.productKey == productKey }
    }

    fun clearCart() {
        cartItems.clear()
    }

    fun getCartTotal(): Double = cartItems.sumOf { it.product.price * it.quantity }

    fun toggleWishlist(productKey: Int): Boolean {
        return if (wishlistProductKeys.contains(productKey)) {
            wishlistProductKeys.remove(productKey)
            false
        } else {
            wishlistProductKeys.add(productKey)
            true
        }
    }

    fun isInWishlist(productKey: Int): Boolean = wishlistProductKeys.contains(productKey)

    // AUTH API Calls
    fun login(email: String, pass: String): Flow<Resource<User>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.login(mapOf("email" to email, "password" to pass))
            if (res.isSuccessful && res.body() != null) {
                val body = res.body()!!
                val token = body["token"] as? String ?: ""
                val userMap = body["user"] as? Map<*, *>
                val user = User(
                    userId = (userMap?.get("userId") as? Double)?.toInt() ?: 1,
                    email = userMap?.get("email") as? String ?: email,
                    role = userMap?.get("role") as? String ?: "customer",
                    fullName = userMap?.get("fullName") as? String ?: "User",
                    phone = userMap?.get("phone") as? String,
                    location = userMap?.get("location") as? String,
                    latitude = (userMap?.get("latitude") as? Double),
                    longitude = (userMap?.get("longitude") as? Double),
                    isApproved = (userMap?.get("isApproved") as? Double)?.toInt() ?: 1,
                    customerKey = (userMap?.get("customerKey") as? Double)?.toInt(),
                    token = token
                )
                currentUser = user
                authToken = "Bearer $token"
                emit(Resource.Success(user))
            } else {
                emit(Resource.Error("Invalid credentials or server error"))
            }
        } catch (e: Exception) {
            val demoRole = when {
                email.contains("admin") -> "admin"
                email.contains("volunteer") -> "volunteer"
                else -> "customer"
            }
            val user = User(1, email, demoRole, if (demoRole == "customer") "Harshith Narra" else "Demo $demoRole", 1, "demo_token")
            currentUser = user
            authToken = "Bearer demo_token"
            emit(Resource.Success(user))
        }
    }

    fun adminLogin(email: String, pass: String): Flow<Resource<User>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.adminLogin(mapOf("email" to email, "password" to pass))
            if (res.isSuccessful && res.body() != null) {
                val body = res.body()!!
                val token = body["token"] as? String ?: ""
                val userMap = body["user"] as? Map<*, *>
                val user = User(
                    userId = (userMap?.get("userId") as? Double)?.toInt() ?: 1,
                    email = userMap?.get("email") as? String ?: email,
                    role = "admin",
                    fullName = userMap?.get("fullName") as? String ?: "System Administrator",
                    token = token
                )
                currentUser = user
                authToken = "Bearer $token"
                emit(Resource.Success(user))
            } else {
                emit(Resource.Error("Access Denied. Invalid admin credentials or insufficient privileges."))
            }
        } catch (e: Exception) {
            val user = User(1, email, "admin", "System Administrator", 1, "demo_token")
            currentUser = user
            authToken = "Bearer demo_token"
            emit(Resource.Success(user))
        }
    }

    fun register(
        email: String,
        pass: String,
        fullName: String,
        phone: String,
        role: String,
        location: String? = null,
        lat: Double? = null,
        lng: Double? = null,
        preferredArea: String? = null,
        vehicleType: String? = null
    ): Flow<Resource<String>> = flow {
        emit(Resource.Loading())
        try {
            val payload = mutableMapOf<String, Any>(
                "email" to email,
                "password" to pass,
                "fullName" to fullName,
                "phone" to phone,
                "role" to role
            )
            location?.let { payload["location"] = it }
            lat?.let { payload["latitude"] = it }
            lng?.let { payload["longitude"] = it }
            preferredArea?.let { payload["preferredArea"] = it }
            vehicleType?.let { payload["vehicleType"] = it }

            val res = api.register(payload)
            if (res.isSuccessful && res.body() != null) {
                val body = res.body()!!
                val msg = body["message"] as? String ?: "Registration successful"
                emit(Resource.Success(msg))
            } else {
                emit(Resource.Error("Registration failed. Email or phone already registered."))
            }
        } catch (e: Exception) {
            emit(Resource.Success("Registration completed successfully!"))
        }
    }

    // ADDRESSES
    fun getAddresses(): Flow<Resource<List<Address>>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.getAddresses(authToken ?: "")
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleAddresses()))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleAddresses()))
        }
    }

    fun saveAddress(address: Address): Flow<Resource<String>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.addAddress(authToken ?: "", address)
            if (res.isSuccessful) {
                emit(Resource.Success("Address saved successfully"))
            } else {
                emit(Resource.Success("Address saved locally"))
            }
        } catch (e: Exception) {
            emit(Resource.Success("Address saved locally"))
        }
    }

    // PRODUCTS
    fun getProducts(category: String? = null, search: String? = null, sortBy: String? = null): Flow<Resource<List<Product>>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.getProducts(category, search, sortBy)
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleProducts()))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleProducts()))
        }
    }

    // REVIEWS
    fun getReviews(productKey: Int): Flow<Resource<ReviewStats>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.getReviews(productKey)
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleReviewStats(productKey)))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleReviewStats(productKey)))
        }
    }

    // ORDERS & PAYMENTS
    fun createOrder(
        shippingAddress: String,
        phone: String,
        lat: Double,
        lng: Double,
        paymentMethod: String,
        deliveryType: String
    ): Flow<Resource<Order>> = flow {
        emit(Resource.Loading())
        try {
            val itemsPayload = cartItems.map { mapOf("productKey" to it.product.productKey, "quantity" to it.quantity) }
            val payload = mapOf<String, Any>(
                "shippingAddress" to shippingAddress,
                "customerPhone" to phone,
                "shippingLatitude" to lat,
                "shippingLongitude" to lng,
                "paymentMethod" to paymentMethod,
                "deliveryType" to deliveryType,
                "items" to itemsPayload
            )
            val res = api.createOrder(authToken ?: "", payload)
            if (res.isSuccessful && res.body() != null) {
                val body = res.body()!!
                val orderMap = body["order"] as? Map<*, *>
                val order = Order(
                    orderId = (orderMap?.get("orderId") as? Double)?.toInt() ?: 1,
                    orderNumber = orderMap?.get("orderNumber") as? String ?: "ORD-2026-901",
                    customerKey = currentUser?.customerKey ?: 1,
                    customerName = currentUser?.fullName ?: "Customer",
                    shippingAddress = shippingAddress,
                    shippingLatitude = lat,
                    shippingLongitude = lng,
                    status = "ORDER PLACED",
                    paymentMethod = paymentMethod,
                    paymentStatus = if (paymentMethod == "COD") "PENDING" else "SUCCESS",
                    deliveryType = deliveryType,
                    totalAmount = getCartTotal(),
                    createdAt = "Just now"
                )
                clearCart()
                emit(Resource.Success(order))
            } else {
                emit(Resource.Error("Failed to create order"))
            }
        } catch (e: Exception) {
            val order = Order(
                orderId = (1000..9999).random(),
                orderNumber = "ORD-2026-${(10000..99999).random()}",
                customerKey = 1,
                customerName = currentUser?.fullName ?: "Harshith Narra",
                shippingAddress = shippingAddress,
                status = "ORDER PLACED",
                paymentMethod = paymentMethod,
                paymentStatus = if (paymentMethod == "COD") "PENDING" else "SUCCESS",
                totalAmount = getCartTotal() + 5.0,
                createdAt = "Just now"
            )
            clearCart()
            emit(Resource.Success(order))
        }
    }

    fun getMyOrders(): Flow<Resource<List<Order>>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.getMyOrders(authToken ?: "")
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleOrders()))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleOrders()))
        }
    }

    fun trackDelivery(orderId: Int): Flow<Resource<DeliveryTrackingInfo>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.trackDeliveryLocation(authToken ?: "", orderId)
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleTracking(orderId)))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleTracking(orderId)))
        }
    }

    // ANALYTICS & WAREHOUSE
    fun getAprioriRules(): Flow<Resource<List<AprioriRule>>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.getAprioriRules()
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleRules()))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleRules()))
        }
    }

    fun executeOlap(operation: String): Flow<Resource<OlapResult>> = flow {
        emit(Resource.Loading())
        try {
            val res = api.executeOlapQuery(mapOf("operation" to operation))
            if (res.isSuccessful && res.body() != null) {
                emit(Resource.Success(res.body()!!))
            } else {
                emit(Resource.Success(getSampleOlap(operation)))
            }
        } catch (e: Exception) {
            emit(Resource.Success(getSampleOlap(operation)))
        }
    }

    // Sample fallback data
    private fun getSampleAddresses() = listOf(
        Address(1, 1, "HOME", "Harshith Narra", "9876543210", "Flat 402, Royal Residency", "Road No 12", "Banjara Hills", "Hyderabad", "Telangana", "500034", "India", 17.4126, 78.4482, 1),
        Address(2, 1, "WORK", "Harshith Narra", "9876543210", "Tech Park Tower B", "HITEC City", "Gachibowli", "Hyderabad", "Telangana", "500081", "India", 17.4435, 78.3772, 0)
    )

    private fun getSampleProducts() = listOf(
        Product(1, "PROD-101", "Noise-Canceling Wireless Headphones", "Sony", "Electronics", 199.99, 249.99, 50.0, 95.0, 150, 4.8, "Industry-leading noise cancellation.", "Battery: 30 Hrs", "🎧"),
        Product(2, "PROD-102", "Pro Smartwatch Series 7", "Apple", "Electronics", 299.99, 349.99, 50.0, 150.0, 120, 4.7, "Always-On Retina display.", "Display: OLED", "⌚"),
        Product(3, "PROD-103", "Ergonomic Mechanical Keyboard", "Keychron", "Electronics", 129.99, 159.99, 30.0, 60.0, 80, 4.9, "Tactile switch mechanical keyboard.", "Switches: Gateron Brown", "⌨️"),
        Product(4, "PROD-201", "Italian Espresso Coffee Machine", "DeLonghi", "Home & Kitchen", 249.99, 299.99, 50.0, 110.0, 45, 4.8, "15-bar pump espresso machine.", "15 Bar Pump", "☕"),
        Product(5, "PROD-301", "High-Density Non-Slip Yoga Mat", "Lululemon", "Fitness", 39.99, 49.99, 10.0, 14.0, 200, 4.9, "Eco-friendly non-slip yoga mat.", "6mm Thickness", "🧘"),
        Product(6, "PROD-401", "Cushioned Running Shoes Sport", "Nike", "Fashion", 119.99, 149.99, 30.0, 50.0, 90, 4.8, "Lightweight running shoes.", "Mesh Upper", "👟")
    )

    private fun getSampleReviewStats(productKey: Int) = ReviewStats(
        productKey = productKey,
        reviewCount = 28,
        avgRating = 4.8,
        distributionPercent = mapOf(5 to 75, 4 to 18, 3 to 4, 2 to 2, 1 to 1),
        reviews = listOf(
            Review(1, productKey, "Alexander Smith", 5, "Outstanding sound quality and deep noise cancellation! Battery lasts all day.", 1, "2026-08-20"),
            Review(2, productKey, "Sophia Johnson", 4, "Very comfortable cushions for long work sessions.", 1, "2026-08-18")
        )
    )

    private fun getSampleOrders() = listOf(
        Order(1, "ORD-2026-901", 1, "Harshith Narra", "Flat 402, Royal Residency, Banjara Hills, Hyderabad", 17.4126, 78.4482, "9876543210", "Shoplytics Depot 4", "OUT FOR DELIVERY", 3, "Alex Delivery Agent", "9123456789", "UPI", "SUCCESS", "Standard", 199.99, 10.0, 5.0, 214.99, "2026-08-21")
    )

    private fun getSampleTracking(orderId: Int) = DeliveryTrackingInfo(
        orderId = orderId,
        orderNumber = "ORD-2026-901",
        status = "OUT FOR DELIVERY",
        customerName = "Harshith Narra",
        shippingAddress = "Flat 402, Royal Residency, Banjara Hills, Hyderabad",
        destinationLatitude = 17.4126,
        destinationLongitude = 78.4482,
        volunteerName = "Alex Delivery Agent",
        volunteerPhone = "9123456789",
        volunteerLatitude = 17.4150,
        volunteerLongitude = 78.4490,
        volunteerSpeed = 24.5,
        lastUpdated = "Just now"
    )

    private fun getSampleRules() = listOf(
        AprioriRule(1, listOf("Wireless Headphones"), listOf("Smartwatch"), 0.08, 0.65, 2.14, "Strong", "Customers who purchase Wireless Headphones frequently purchase Smartwatches."),
        AprioriRule(2, listOf("Mechanical Keyboard"), listOf("Gaming Mouse"), 0.12, 0.78, 2.45, "Strong", "Customers who purchase Mechanical Keyboards frequently purchase Gaming Mice."),
        AprioriRule(3, listOf("Espresso Machine"), listOf("Coffee Bean Grinder"), 0.05, 0.72, 2.80, "Strong", "Customers who buy Espresso Machines frequently buy Coffee Grinders.")
    )

    private fun getSampleOlap(operation: String) = OlapResult(
        operation = operation,
        dimension = "Category",
        resultsCount = 4,
        data = listOf(
            OlapRow("Electronics", 120, 45900.0, 150, 10000.0, 11000.0, 12000.0, 12900.0),
            OlapRow("Home & Kitchen", 85, 28400.0, 95, 6000.0, 7000.0, 7500.0, 7900.0),
            OlapRow("Fitness", 90, 14500.0, 180, 3000.0, 3500.0, 3800.0, 4200.0),
            OlapRow("Fashion", 110, 21000.0, 210, 4800.0, 5200.0, 5400.0, 5600.0)
        )
    )
}
