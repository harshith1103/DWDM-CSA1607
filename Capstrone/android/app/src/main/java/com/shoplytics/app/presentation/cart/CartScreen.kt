package com.shoplytics.app.presentation.cart

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.CartItem

@Composable
fun CartScreen(
    cartItems: List<CartItem>,
    onRemoveItem: (Int) -> Unit,
    onNavigateCheckout: () -> Unit
) {
    val totalAmount = cartItems.sumOf { it.product.price * it.quantity }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp)
    ) {
        Text("Shopping Cart", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))

        if (cartItems.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("Your shopping cart is empty.", color = TextMuted, fontSize = 14.sp)
            }
        } else {
            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(cartItems) { item ->
                    Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(item.product.imageURL, fontSize = 28.sp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(item.product.productName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    Text("Qty: ${item.quantity} • $${String.format("%.2f", item.product.price)}", fontSize = 12.sp, color = PrimaryCyan)
                                }
                            }
                            IconButton(onClick = { onRemoveItem(item.product.productKey) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = AccentRose)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Total Payable:", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("$${String.format("%.2f", totalAmount)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Button(
                        onClick = onNavigateCheckout,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                    ) {
                        Text("Proceed to Checkout", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
