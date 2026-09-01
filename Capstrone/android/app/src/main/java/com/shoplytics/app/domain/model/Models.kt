package com.shoplytics.app.domain.model

data class User(
    val userId: Int,
    val email: String,
    val role: String,
    val fullName: String,
    val phone: String? = null,
    val location: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isApproved: Int = 1,
    val customerKey: Int? = null,
    val token: String? = null
)

data class Address(
    val addressId: Int = 0,
    val customerKey: Int = 0,
    val label: String = "HOME",
    val fullName: String = "",
    val phone: String = "",
    val houseFlat: String = "",
    val street: String = "",
    val area: String = "",
    val city: String = "",
    val state: String = "Telangana",
    val postalCode: String = "500001",
    val country: String = "India",
    val latitude: Double = 17.3850,
    val longitude: Double = 78.4867,
    val isDefault: Int = 0
)

data class Product(
    val productKey: Int,
    val productID: String,
    val productName: String,
    val brand: String = "Shoplytics",
    val category: String,
    val price: Double,
    val originalPrice: Double = 0.0,
    val discount: Double = 0.0,
    val cost: Double = 0.0,
    val stockQuantity: Int = 100,
    val popularityRating: Double = 4.5,
    val description: String = "",
    val specifications: String = "",
    val imageURL: String = "📦",
    val explanation: String? = null
)

data class CartItem(
    val product: Product,
    var quantity: Int = 1
)

data class OrderItem(
    val orderItemId: Int? = null,
    val productKey: Int,
    val productName: String,
    val brand: String = "Shoplytics",
    val imageURL: String = "📦",
    val quantity: Int,
    val unitPrice: Double
)

data class Order(
    val orderId: Int,
    val orderNumber: String,
    val customerKey: Int,
    val customerName: String,
    val shippingAddress: String,
    val shippingLatitude: Double = 17.4126,
    val shippingLongitude: Double = 78.4482,
    val customerPhone: String = "9876543210",
    val collectionAddress: String = "Shoplytics Central Hub, Depot 4",
    val status: String = "ORDER PLACED",
    val volunteerUserId: Int? = null,
    val volunteerName: String? = null,
    val volunteerPhone: String? = null,
    val paymentMethod: String = "COD",
    val paymentStatus: String = "PENDING",
    val deliveryType: String = "Standard",
    val subtotal: Double = 0.0,
    val taxAmount: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val totalAmount: Double,
    val createdAt: String,
    val items: List<OrderItem> = emptyList()
)

data class Review(
    val reviewId: Int = 0,
    val productKey: Int,
    val customerName: String,
    val rating: Int,
    val comment: String,
    val isVerifiedPurchase: Int = 1,
    val createdAt: String
)

data class ReviewStats(
    val productKey: Int,
    val reviewCount: Int,
    val avgRating: Double,
    val distributionPercent: Map<Int, Int> = mapOf(5 to 72, 4 to 18, 3 to 6, 2 to 3, 1 to 1),
    val reviews: List<Review> = emptyList()
)

data class DeliveryTrackingInfo(
    val orderId: Int,
    val orderNumber: String,
    val status: String,
    val customerName: String,
    val shippingAddress: String,
    val destinationLatitude: Double,
    val destinationLongitude: Double,
    val volunteerName: String,
    val volunteerPhone: String,
    val volunteerLatitude: Double,
    val volunteerLongitude: Double,
    val volunteerSpeed: Double = 0.0,
    val lastUpdated: String
)

data class VolunteerInfo(
    val userId: Int,
    val fullName: String,
    val email: String,
    val phone: String?,
    val location: String?,
    val isApproved: Int,
    val preferredArea: String?,
    val vehicleType: String?,
    val availabilityStatus: String?
)

data class CustomerInsight(
    val customerName: String,
    val customerSegment: String,
    val totalOrders: Int,
    val totalSpending: Double,
    val avgOrderValue: Double,
    val lastPurchaseDate: String,
    val favoriteCategory: String
)

data class AprioriRule(
    val ruleId: Int = 0,
    val antecedents: List<String>,
    val consequents: List<String>,
    val support: Double,
    val confidence: Double,
    val lift: Double,
    val ruleStrength: String = "Strong",
    val explanation: String = ""
)

data class OlapRow(
    val dimension: String,
    val totalOrders: Int = 0,
    val totalRevenue: Double = 0.0,
    val totalUnits: Int = 0,
    val q1Revenue: Double = 0.0,
    val q2Revenue: Double = 0.0,
    val q3Revenue: Double = 0.0,
    val q4Revenue: Double = 0.0
)

data class OlapResult(
    val operation: String,
    val dimension: String,
    val resultsCount: Int,
    val data: List<OlapRow>
)

data class WarehouseMetrics(
    val totalRevenue: Double,
    val totalOrders: Int,
    val totalCustomers: Int,
    val avgOrderValue: Double,
    val totalUnitsSold: Int,
    val topCategory: String
)

data class CustomerSegment(
    val customerId: String,
    val fullName: String,
    val recencyDays: Int,
    val frequencyCount: Int,
    val monetaryTotal: Double,
    val rfmSegment: String,
    val churnRiskPercent: Double,
    val purchaseLikelihoodPercent: Double
)

data class NotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val timestamp: String,
    val read: Boolean = false
)

data class CustomerEvent(
    val eventId: String = "EVT-${System.currentTimeMillis()}",
    val customerId: Int? = null,
    val productId: String? = null,
    val eventType: String,
    val timestamp: String = System.currentTimeMillis().toString(),
    val sessionId: String = "ANDROID_SESS",
    val category: String? = null,
    val device: String = "Android App",
    val quantity: Int = 1,
    val price: Double = 0.0
)
