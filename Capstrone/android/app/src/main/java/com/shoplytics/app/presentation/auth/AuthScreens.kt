package com.shoplytics.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shoplytics.app.core.theme.*
import com.shoplytics.app.domain.model.User

@Composable
fun WelcomeScreen(
    onNavigateLogin: () -> Unit,
    onNavigateSignup: () -> Unit,
    onNavigateCustomerLogin: () -> Unit,
    onNavigateVolunteerLogin: () -> Unit,
    onNavigateAdminLogin: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Radar,
                    contentDescription = "Shoplytics Logo",
                    tint = PrimaryCyan,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "SHOPLYTICS",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "\"Shop Smarter. Understand Better.\"",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextMuted
                )

                Spacer(modifier = Modifier.height(28.dp))

                Text(
                    text = "Welcome! Choose how you would like to proceed:",
                    fontSize = 12.sp,
                    color = Color.White,
                    modifier = Modifier.align(Alignment.Start)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Primary LOGIN Button
                Button(
                    onClick = onNavigateLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Login, contentDescription = null, tint = DarkBg)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("LOGIN TO ACCOUNT", fontWeight = FontWeight.Bold, color = DarkBg, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Primary SIGN UP Button
                Button(
                    onClick = onNavigateSignup,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("CREATE NEW ACCOUNT (SIGN UP)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(20.dp))

                Divider(color = Color(0xFF334155), thickness = 1.dp)

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "Or Continue by Role:",
                    fontSize = 12.sp,
                    color = TextMuted,
                    modifier = Modifier.align(Alignment.Start)
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Continue as Customer
                OutlinedButton(
                    onClick = onNavigateCustomerLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Continue as Customer", fontSize = 13.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Continue as Volunteer
                OutlinedButton(
                    onClick = onNavigateVolunteerLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) {
                    Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = AccentEmerald, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Continue as Volunteer", fontSize = 13.sp)
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Admin Portal Link
                TextButton(onClick = onNavigateAdminLogin) {
                    Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("🔒 Protected Admin Portal", color = AccentAmber, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSubmit: (email: String, pass: String, onComplete: (User?, String?) -> Unit) -> Unit,
    onNavigateSignup: () -> Unit,
    onNavigateAdminLogin: () -> Unit,
    onLoginSuccess: (User) -> Unit
) {
    var email by remember { mutableStateOf("customer@gmail.com") }
    var password by remember { mutableStateOf("123456") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    fun validateAndSubmit() {
        errorMessage = null
        val trimmedEmail = email.lowercase().trim()

        if (trimmedEmail.isEmpty() || !trimmedEmail.endsWith("@gmail.com")) {
            errorMessage = "Email address must end with @gmail.com (e.g. user@gmail.com)."
            return
        }

        if (password.length != 6 || !password.all { it.isDigit() }) {
            errorMessage = "Password must contain exactly 6 digits."
            return
        }

        isLoading = true
        onLoginSubmit(trimmedEmail, password) { user, err ->
            isLoading = false
            if (user != null) {
                onLoginSuccess(user)
            } else {
                errorMessage = err ?: "Invalid email or password."
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Storefront,
                    contentDescription = "Shoplytics",
                    tint = PrimaryCyan,
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Sign In to Shoplytics",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Shop Smarter. Understand Better.",
                    fontSize = 12.sp,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.height(20.dp))

                // Quick Login Selector Role Buttons
                Text(
                    text = "⚡ Quick Account Preset:",
                    fontSize = 11.sp,
                    color = TextMuted,
                    modifier = Modifier.align(Alignment.Start)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            email = "customer@gmail.com"
                            password = "123456"
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo)
                    ) {
                        Text("Customer", fontSize = 10.sp)
                    }
                    Button(
                        onClick = {
                            email = "volunteer@gmail.com"
                            password = "123456"
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald)
                    ) {
                        Text("Volunteer", fontSize = 10.sp)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                errorMessage?.let {
                    Surface(
                        color = Color(0xFF3E1A1A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                    ) {
                        Text(
                            text = "⚠️ $it",
                            color = Color(0xFFFF6B6B),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Address (@gmail.com)") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = PrimaryCyan) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = PrimaryCyan)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) password = it },
                    label = { Text("Password (6 Numeric Digits)") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = PrimaryCyan) },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    supportingText = { Text("Password must contain exactly 6 digits.", fontSize = 10.sp, color = TextMuted) },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = PrimaryCyan)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = { validateAndSubmit() },
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = DarkBg, strokeWidth = 2.dp)
                    } else {
                        Text("LOGIN", fontWeight = FontWeight.Bold, color = DarkBg)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onNavigateSignup) {
                        Text("SIGN UP", color = PrimaryCyan, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    TextButton(onClick = onNavigateAdminLogin) {
                        Text("🔒 Admin Login", color = AccentAmber, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminLoginScreen(
    onAdminLoginSubmit: (email: String, pass: String, onComplete: (User?, String?) -> Unit) -> Unit,
    onBackToCustomerLogin: () -> Unit,
    onAdminLoginSuccess: (User) -> Unit
) {
    var email by remember { mutableStateOf("admin@gmail.com") }
    var password by remember { mutableStateOf("123456") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    fun submitAdminLogin() {
        errorMessage = null
        if (!email.lowercase().endsWith("@gmail.com")) {
            errorMessage = "Admin email must be a valid Gmail address."
            return
        }
        if (password.length != 6 || !password.all { it.isDigit() }) {
            errorMessage = "Password must contain exactly 6 digits."
            return
        }

        isLoading = true
        onAdminLoginSubmit(email, password) { user, err ->
            isLoading = false
            if (user != null && user.role == "admin") {
                onAdminLoginSuccess(user)
            } else {
                errorMessage = err ?: "Access Denied. Admin privileges required."
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.AdminPanelSettings,
                    contentDescription = "Admin Portal",
                    tint = AccentAmber,
                    modifier = Modifier.size(56.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "ADMIN PORTAL SIGN IN",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = AccentAmber
                )
                Text(
                    text = "Protected Administrative Control Center",
                    fontSize = 11.sp,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.height(20.dp))

                errorMessage?.let {
                    Surface(
                        color = Color(0xFF3E1A1A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                    ) {
                        Text(
                            text = "⚠️ $it",
                            color = Color(0xFFFF6B6B),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Admin Email Address") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = AccentAmber) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = AccentAmber)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) password = it },
                    label = { Text("Admin Password (6 Digits)") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = AccentAmber) },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = AccentAmber)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = { submitAdminLogin() },
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentAmber)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = DarkBg, strokeWidth = 2.dp)
                    } else {
                        Text("AUTHENTICATE ADMIN", fontWeight = FontWeight.Bold, color = DarkBg)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                TextButton(onClick = onBackToCustomerLogin) {
                    Text("← Back to Standard Sign In", color = PrimaryCyan, fontSize = 12.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignupScreen(
    onSignupSubmit: (
        fullName: String,
        email: String,
        password: String,
        phone: String,
        role: String,
        location: String?,
        onComplete: (Boolean, String?) -> Unit
    ) -> Unit,
    onNavigateLogin: () -> Unit,
    onNavigateLocationPicker: () -> Unit,
    selectedLocationAddress: String? = null
) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("CUSTOMER") }
    var locationAddress by remember { mutableStateOf(selectedLocationAddress ?: "Hyderabad, Telangana, India") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    LaunchedEffect(selectedLocationAddress) {
        if (!selectedLocationAddress.isNullOrEmpty()) {
            locationAddress = selectedLocationAddress
        }
    }

    fun submitRegistration() {
        errorMessage = null
        successMessage = null

        if (fullName.trim().length < 2) {
            errorMessage = "Full Name must be at least 2 characters long."
            return
        }

        val trimmedEmail = email.lowercase().trim()
        if (!trimmedEmail.endsWith("@gmail.com")) {
            errorMessage = "Email must end with @gmail.com (e.g. user@gmail.com)."
            return
        }

        if (password.length != 6 || !password.all { it.isDigit() }) {
            errorMessage = "Password must contain exactly 6 numeric digits."
            return
        }

        if (password != confirmPassword) {
            errorMessage = "Passwords do not match."
            return
        }

        val cleanPhone = phone.replace(/\D/g, "")
        if (cleanPhone.length != 10) {
            errorMessage = "Phone number must be exactly 10 numeric digits."
            return
        }

        if (role == "ADMIN") {
            errorMessage = "Admin accounts cannot be created via public registration."
            return
        }

        isLoading = true
        onSignupSubmit(fullName.trim(), trimmedEmail, password, cleanPhone, role.lowercase(), locationAddress) { success, msg ->
            isLoading = false
            if (success) {
                successMessage = msg ?: "Account registered successfully!"
            } else {
                errorMessage = msg ?: "Registration failed."
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Create Shoplytics Account",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Register as Customer or Delivery Volunteer",
                    fontSize = 11.sp,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.height(16.dp))

                errorMessage?.let {
                    Surface(
                        color = Color(0xFF3E1A1A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp)
                    ) {
                        Text(
                            text = "⚠️ $it",
                            color = Color(0xFFFF6B6B),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                successMessage?.let {
                    Surface(
                        color = Color(0xFF1E3A2B),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text(text = "✓ $it", color = AccentEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(6.dp))
                            Button(
                                onClick = onNavigateLogin,
                                colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("PROCEED TO SIGN IN", color = DarkBg, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Full Name (Min 2 chars)") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = PrimaryCyan) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Gmail Address (@gmail.com)") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = PrimaryCyan) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) password = it },
                        label = { Text("Password (6 Digits)") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = PrimaryCyan) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) confirmPassword = it },
                        label = { Text("Confirm Password") },
                        leadingIcon = { Icon(Icons.Default.LockReset, contentDescription = null, tint = PrimaryCyan) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // STRICT EXACT 10 DIGITS PHONE NUMBER INPUT WITH COUNTRY CODE SELECTOR
                var countryCode by remember { mutableStateOf("🇮🇳 +91") }
                Text("Select Country Code:", fontSize = 11.sp, color = TextMuted, modifier = Modifier.align(Alignment.Start))
                Spacer(modifier = Modifier.height(2.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(listOf("🇮🇳 +91", "🇺🇸 +1", "🇬🇧 +44", "🇦🇺 +61", "🇨🇦 +1", "🇦🇪 +971")) { code ->
                        FilterChip(
                            selected = countryCode == code,
                            onClick = { countryCode = code },
                            label = { Text(code, fontSize = 10.sp) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { if (it.length <= 10 && it.all { c -> c.isDigit() }) phone = it },
                    label = { Text("Phone Number ($countryCode - Max 10 Digits)") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = PrimaryCyan) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    supportingText = { Text("Strictly 10 digits required after country code $countryCode.", fontSize = 10.sp, color = TextMuted) },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = PrimaryCyan)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Location Picker row
                OutlinedTextField(
                    value = locationAddress,
                    onValueChange = { locationAddress = it },
                    label = { Text("Delivery Location") },
                    leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = PrimaryCyan) },
                    trailingIcon = {
                        IconButton(onClick = onNavigateLocationPicker) {
                            Icon(Icons.Default.Map, contentDescription = "Select on Map", tint = PrimaryCyan)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Role selection (CUSTOMER vs VOLUNTEER only, ADMIN excluded)
                Text("Select Account Role:", fontSize = 12.sp, color = TextMuted, modifier = Modifier.align(Alignment.Start))
                Spacer(modifier = Modifier.height(4.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = role == "CUSTOMER",
                        onClick = { role = "CUSTOMER" },
                        label = { Text("Customer") },
                        leadingIcon = { Icon(Icons.Default.ShoppingBag, contentDescription = null) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChip(
                        selected = role == "VOLUNTEER",
                        onClick = { role = "VOLUNTEER" },
                        label = { Text("Volunteer") },
                        leadingIcon = { Icon(Icons.Default.TwoWheeler, contentDescription = null) },
                        modifier = Modifier.weight(1f)
                    )
                }

                if (role == "VOLUNTEER") {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "ℹ️ Volunteer accounts require Admin approval before dispatch access is enabled.",
                        fontSize = 10.sp,
                        color = AccentAmber
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = { submitRegistration() },
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = DarkBg, strokeWidth = 2.dp)
                    } else {
                        Text("CREATE ACCOUNT", fontWeight = FontWeight.Bold, color = DarkBg)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                TextButton(onClick = onNavigateLogin) {
                    Text("Already have an account? Sign In Here", color = PrimaryCyan, fontSize = 12.sp)
                }
            }
        }
    }
}
