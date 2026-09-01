package com.shoplytics.app.presentation.checkout

import androidx.compose.foundation.background
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class CountryPhoneRule(val flagCode: String, val countryName: String, val digits: Int)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    totalAmount: Double = 199.99,
    onOrderConfirmed: () -> Unit
) {
    var address by remember { mutableStateOf("Flat 402, Royal Residency, Road No 12, Banjara Hills, Hyderabad") }
    var phone by remember { mutableStateOf("9876543210") }
    var selectedPaymentTab by remember { mutableStateOf("UPI") }

    val countries = remember {
        listOf(
            CountryPhoneRule("🇮🇳 +91", "India", 10),
            CountryPhoneRule("🇺🇸 +1", "USA/Canada", 10),
            CountryPhoneRule("🇬🇧 +44", "UK", 10),
            CountryPhoneRule("🇦🇺 +61", "Australia", 9),
            CountryPhoneRule("🇦🇪 +971", "UAE", 9),
            CountryPhoneRule("🇸🇬 +65", "Singapore", 8)
        )
    }
    var selectedCountry by remember { mutableStateOf(countries[0]) }

    // UPI Payment State
    var upiId by remember { mutableStateOf("customer@okaxis") }
    var isUpiSending by remember { mutableStateOf(false) }
    var upiApprovedMessage by remember { mutableStateOf<String?>(null) }

    // Card Payment State (Credit vs Debit & Networks)
    var cardType by remember { mutableStateOf("Credit") }
    var cardNetwork by remember { mutableStateOf("Visa") }
    var cardNumber by remember { mutableStateOf("4532 9876 5432 1098") }
    var cardExpiry by remember { mutableStateOf("12/28") }
    var cardCvv by remember { mutableStateOf("432") }

    val coroutineScope = rememberCoroutineScope()

    fun sendUpiCollectRequest() {
        if (!upiId.contains("@")) return
        isUpiSending = true
        upiApprovedMessage = null
        coroutineScope.launch {
            delay(1500)
            isUpiSending = false
            upiApprovedMessage = "✓ Collect Request Approved by $upiId! Ref: TXN-UPI-${System.currentTimeMillis()}"
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Order Checkout & Logistics", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Verify address, country phone code & choose payment method", fontSize = 12.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(16.dp))

        // Delivery Address Card
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Delivery Address / Shipping Location", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Full Address") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Phone, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Contact Phone (${selectedCountry.flagCode})", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Spacer(modifier = Modifier.height(4.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(countries) { item ->
                        FilterChip(
                            selected = selectedCountry == item,
                            onClick = {
                                selectedCountry = item
                                if (phone.length > item.digits) {
                                    phone = phone.take(item.digits)
                                }
                            },
                            label = { Text("${item.flagCode} (${item.digits}d)", fontSize = 10.sp) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { input ->
                        if (input.length <= selectedCountry.digits && input.all { c -> c.isDigit() }) {
                            phone = input
                        }
                    },
                    label = { Text("Phone Number (${selectedCountry.digits} Digits)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    supportingText = { Text("Strictly ${selectedCountry.digits} digits required for ${selectedCountry.countryName}.", fontSize = 10.sp, color = TextMuted) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Payment Method Tabs Card
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("💳 Select Payment Method", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(
                        selected = selectedPaymentTab == "UPI",
                        onClick = { selectedPaymentTab = "UPI" },
                        label = { Text("UPI Payment", fontSize = 11.sp) },
                        leadingIcon = { Icon(Icons.Default.QrCodeScanner, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChip(
                        selected = selectedPaymentTab == "CARD",
                        onClick = { selectedPaymentTab = "CARD" },
                        label = { Text("Card", fontSize = 11.sp) },
                        leadingIcon = { Icon(Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChip(
                        selected = selectedPaymentTab == "COD",
                        onClick = { selectedPaymentTab = "COD" },
                        label = { Text("COD", fontSize = 11.sp) },
                        leadingIcon = { Icon(Icons.Default.Payments, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                when (selectedPaymentTab) {
                    "UPI" -> {
                        Surface(
                            color = PrimaryCyan.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryCyan.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("📱 Option 1: Dynamic UPI QR Scanner", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                                Spacer(modifier = Modifier.height(8.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(130.dp)
                                        .background(Color.White, RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.QrCode2, contentDescription = null, tint = DarkBg, modifier = Modifier.size(72.dp))
                                        Text("Scan to pay ₹${String.format("%.2f", totalAmount)}", fontSize = 11.sp, color = DarkBg, fontWeight = FontWeight.Bold)
                                        Text("GPay / PhonePe / Paytm / BHIM", fontSize = 9.sp, color = Color.Gray)
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))
                                Divider(color = Color(0xFF334155))
                                Spacer(modifier = Modifier.height(14.dp))

                                Text("📲 Option 2: Enter UPI ID (Send Payment Request)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                                Spacer(modifier = Modifier.height(6.dp))

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    OutlinedTextField(
                                        value = upiId,
                                        onValueChange = { upiId = it },
                                        label = { Text("UPI ID (e.g. user@okaxis)") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                    Button(
                                        onClick = { sendUpiCollectRequest() },
                                        enabled = !isUpiSending,
                                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        if (isUpiSending) {
                                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = DarkBg, strokeWidth = 2.dp)
                                        } else {
                                            Text("Send Request", fontSize = 10.sp, color = DarkBg, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                upiApprovedMessage?.let { msg ->
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(msg, fontSize = 11.sp, color = AccentEmerald, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                    "CARD" -> {
                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.padding(2.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("💳 Select Card Category:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = cardType == "Credit",
                                        onClick = { cardType = "Credit" },
                                        label = { Text("Credit Card", fontSize = 11.sp) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    FilterChip(
                                        selected = cardType == "Debit",
                                        onClick = { cardType = "Debit" },
                                        label = { Text("Debit Card", fontSize = 11.sp) },
                                        modifier = Modifier.weight(1f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))
                                Text("Select Card Network Brand:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Spacer(modifier = Modifier.height(4.dp))
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    items(listOf("Visa", "Mastercard", "RuPay", "Amex")) { brand ->
                                        FilterChip(
                                            selected = cardNetwork == brand,
                                            onClick = { cardNetwork = brand },
                                            label = { Text("💳 $brand", fontSize = 10.sp) }
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                OutlinedTextField(
                                    value = cardNumber,
                                    onValueChange = { input ->
                                        val digitsOnly = input.filter { it.isDigit() }.take(16)
                                        cardNumber = digitsOnly.chunked(4).joinToString(" ")
                                        if (digitsOnly.startsWith("4")) cardNetwork = "Visa"
                                        else if (digitsOnly.startsWith("5")) cardNetwork = "Mastercard"
                                        else if (digitsOnly.startsWith("6")) cardNetwork = "RuPay"
                                        else if (digitsOnly.startsWith("3")) cardNetwork = "Amex"
                                    },
                                    label = { Text("$cardType Card ($cardNetwork)") },
                                    leadingIcon = { Icon(Icons.Default.CreditCard, contentDescription = null, tint = PrimaryCyan) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = cardExpiry,
                                        onValueChange = { cardExpiry = it.take(5) },
                                        label = { Text("Expiry (MM/YY)") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                    OutlinedTextField(
                                        value = cardCvv,
                                        onValueChange = { if (it.length <= 4 && it.all { c -> c.isDigit() }) cardCvv = it },
                                        label = { Text("CVV") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                }
                            }
                        }
                    }
                    "COD" -> {
                        Surface(
                            color = AccentEmerald.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AccentEmerald.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("💵 Cash on Delivery Selected", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Pay exact cash amount to the assigned volunteer delivery agent upon package arrival at your address.", fontSize = 11.sp, color = TextMuted)
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Total Summary Card & Submit Order
        Card(colors = CardDefaults.cardColors(containerColor = CardBg), shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total Amount Payable:", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("₹${String.format("%.2f", totalAmount)}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onOrderConfirmed,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = DarkBg)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("CONFIRM & PLACE ORDER", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DarkBg)
                }
            }
        }
    }
}
