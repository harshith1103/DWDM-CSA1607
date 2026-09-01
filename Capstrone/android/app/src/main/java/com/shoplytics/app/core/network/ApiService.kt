package com.shoplytics.app.core.network

import com.shoplytics.app.domain.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): Response<Map<String, Any>>

    @POST("api/auth/admin-login")
    suspend fun adminLogin(@Body body: Map<String, String>): Response<Map<String, Any>>

    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, Any>): Response<Map<String, Any>>

    @GET("api/auth/me")
    suspend fun getCurrentUser(@Header("Authorization") token: String): Response<Map<String, Any>>

    // Addresses
    @GET("api/addresses")
    suspend fun getAddresses(@Header("Authorization") token: String): Response<List<Address>>

    @POST("api/addresses")
    suspend fun addAddress(
        @Header("Authorization") token: String,
        @Body address: Address
    ): Response<Map<String, Any>>

    @PUT("api/addresses/{id}/default")
    suspend fun setDefaultAddress(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<Map<String, Any>>

    @DELETE("api/addresses/{id}")
    suspend fun deleteAddress(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<Map<String, Any>>

    // Products & Catalog
    @GET("api/products")
    suspend fun getProducts(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("sortBy") sortBy: String? = null
    ): Response<List<Product>>

    @GET("api/products/categories")
    suspend fun getCategories(): Response<List<String>>

    @GET("api/products/trending")
    suspend fun getTrendingProducts(): Response<List<Product>>

    @GET("api/products/{id}")
    suspend fun getProductDetails(@Path("id") id: String): Response<Map<String, Any>>

    // Reviews
    @GET("api/reviews/{productKey}")
    suspend fun getReviews(@Path("productKey") productKey: Int): Response<ReviewStats>

    @POST("api/reviews")
    suspend fun submitReview(
        @Header("Authorization") token: String,
        @Body body: Map<String, Any>
    ): Response<Map<String, Any>>

    // Orders & Tracking
    @POST("api/orders")
    suspend fun createOrder(
        @Header("Authorization") token: String,
        @Body body: Map<String, Any>
    ): Response<Map<String, Any>>

    @GET("api/orders/my-orders")
    suspend fun getMyOrders(@Header("Authorization") token: String): Response<List<Order>>

    @POST("api/orders/{id}/cancel")
    suspend fun cancelOrder(
        @Header("Authorization") token: String,
        @Path("id") orderId: Int
    ): Response<Map<String, Any>>

    @POST("api/orders/{id}/return")
    suspend fun returnOrder(
        @Header("Authorization") token: String,
        @Path("id") orderId: Int,
        @Body body: Map<String, String>
    ): Response<Map<String, Any>>

    @GET("api/orders/admin")
    suspend fun getAdminOrders(@Header("Authorization") token: String): Response<List<Order>>

    @PUT("api/orders/{id}/assign")
    suspend fun assignVolunteer(
        @Header("Authorization") token: String,
        @Path("id") orderId: Int,
        @Body body: Map<String, Int>
    ): Response<Map<String, Any>>

    @GET("api/orders/volunteer")
    suspend fun getVolunteerDeliveries(@Header("Authorization") token: String): Response<List<Order>>

    @PUT("api/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") token: String,
        @Path("id") orderId: Int,
        @Body body: Map<String, String>
    ): Response<Map<String, Any>>

    // Payments
    @POST("api/payments/verify")
    suspend fun verifyPayment(
        @Header("Authorization") token: String,
        @Body body: Map<String, Any>
    ): Response<Map<String, Any>>

    // Delivery Location Tracking
    @POST("api/delivery/location")
    suspend fun updateDeliveryLocation(
        @Header("Authorization") token: String,
        @Body body: Map<String, Any>
    ): Response<Map<String, Any>>

    @GET("api/delivery/track/{orderId}")
    suspend fun trackDeliveryLocation(
        @Header("Authorization") token: String,
        @Path("orderId") orderId: Int
    ): Response<DeliveryTrackingInfo>

    // Admin Dispatch & Volunteer Approval
    @GET("api/admin/volunteers")
    suspend fun getAdminVolunteers(@Header("Authorization") token: String): Response<List<VolunteerInfo>>

    @PUT("api/admin/volunteers/{userId}/approve")
    suspend fun approveVolunteer(
        @Header("Authorization") token: String,
        @Path("userId") userId: Int
    ): Response<Map<String, Any>>

    @GET("api/admin/dispatch/map")
    suspend fun getAdminDispatchMap(@Header("Authorization") token: String): Response<Map<String, Any>>

    // Apriori & Recommendations
    @GET("api/apriori/rules")
    suspend fun getAprioriRules(): Response<List<AprioriRule>>

    @POST("api/apriori/mine")
    suspend fun runAprioriMining(@Body body: Map<String, Double>): Response<Map<String, Any>>

    @POST("api/recommendations/cart")
    suspend fun getCartRecommendations(@Body body: Map<String, List<String>>): Response<Map<String, Any>>

    // OLAP Analytics
    @POST("api/olap/query")
    suspend fun executeOlapQuery(@Body body: Map<String, String>): Response<OlapResult>

    // Warehouse & Analytics
    @GET("api/analytics/kpi")
    suspend fun getWarehouseKPIs(): Response<WarehouseMetrics>

    @GET("api/analytics/rfm")
    suspend fun getRfmAnalytics(): Response<List<CustomerSegment>>

    // Customer Insights & Events
    @GET("api/events/my-insights")
    suspend fun getCustomerInsights(@Header("Authorization") token: String): Response<CustomerInsight>

    @POST("api/events/track")
    suspend fun trackCustomerEvent(
        @Header("Authorization") token: String?,
        @Body event: CustomerEvent
    ): Response<Map<String, Any>>

    // Notifications
    @GET("api/notifications")
    suspend fun getNotifications(): Response<List<NotificationItem>>
}
