package com.shoplytics.app.presentation.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.shoplytics.app.domain.model.Order
import com.shoplytics.app.domain.model.User
import com.shoplytics.app.domain.model.VolunteerInfo

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPortalScreen(
    adminUser: User,
    volunteersList: List<VolunteerInfo>,
    ordersList: List<Order>,
    onApproveVolunteer: (userId: Int) -> Unit,
    onAssignVolunteer: (orderId: Int, volunteerUserId: Int) -> Unit,
    onNavigateApriori: () -> Unit,
    onNavigateOlap: () -> Unit,
    onNavigateWarehouse: () -> Unit,
    onNavigateAnalytics: () -> Unit,
    onNavigateRfm: () -> Unit,
    onNavigateReports: () -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }

    val pendingVolunteers = remember(volunteersList) { volunteersList.filter { it.isApproved == 0 } }
    val approvedVolunteers = remember(volunteersList) { volunteersList.filter { it.isApproved == 1 } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Admin Control Hub", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = AccentAmber)
                        Text("Logged in as ${adminUser.fullName}", fontSize = 11.sp, color = TextMuted)
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Logout", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardBg)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkBg)
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = CardBg,
                contentColor = AccentAmber
            ) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("BI & Analytics", fontSize = 11.sp) })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Order Dispatch", fontSize = 11.sp) })
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("Volunteer Approval (${pendingVolunteers.size})", fontSize = 11.sp) })
                Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text("DW & ETL Tools", fontSize = 11.sp) })
            }

            Spacer(modifier = Modifier.height(16.dp))

            when (selectedTab) {
                0 -> {
                    // BI & Analytics Hub Tab
                    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                        Text("⚡ Fast Module Access Launchers", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            AdminModuleCard("BI Analytics Hub", "Revenue & KPIs", Icons.Default.BarChart, PrimaryCyan, Modifier.weight(1f), onNavigateAnalytics)
                            AdminModuleCard("Apriori Mining", "Association Rules", Icons.Default.AutoGraph, PrimaryIndigo, Modifier.weight(1f), onNavigateApriori)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            AdminModuleCard("RFM & Predictive", "Customer Clustering", Icons.Default.Group, AccentEmerald, Modifier.weight(1f), onNavigateRfm)
                            AdminModuleCard("Executive Reports", "PDF & Excel Export", Icons.Default.Description, AccentAmber, Modifier.weight(1f), onNavigateReports)
                        }
                    }
                }
                1 -> {
                    // Order Dispatch Tab
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(ordersList) { order ->
                            AdminDispatchCard(
                                order = order,
                                volunteers = approvedVolunteers,
                                onAssign = { volunteerId -> onAssignVolunteer(order.orderId, volunteerId) }
                            )
                        }
                    }
                }
                2 -> {
                    // Volunteer Approval Tab
                    if (pendingVolunteers.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No pending volunteer registration requests.", color = TextMuted)
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(pendingVolunteers) { volunteer ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = CardBg),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("👤 ${volunteer.fullName}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Text("📧 Email: ${volunteer.email}", fontSize = 12.sp, color = TextMuted)
                                        Text("📞 Phone: ${volunteer.phone ?: "9876543210"}", fontSize = 12.sp, color = TextMuted)
                                        Text("🏍️ Vehicle: ${volunteer.vehicleType ?: "Motorcycle"}", fontSize = 12.sp, color = TextMuted)
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Button(
                                            onClick = { onApproveVolunteer(volunteer.userId) },
                                            colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text("APPROVE VOLUNTEER ACCOUNT", fontWeight = FontWeight.Bold, color = DarkBg)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                3 -> {
                    // DW & ETL Tools Tab
                    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                        AdminModuleCard("OLAP Engine", "Roll-up, Drill-down, Slice, Dice, Pivot", Icons.Default.ViewInAr, PrimaryCyan, Modifier.fillMaxWidth(), onNavigateOlap)
                        Spacer(modifier = Modifier.height(12.dp))
                        AdminModuleCard("Data Warehouse Schema", "Star Schema & Snowflake Architecture", Icons.Default.Storage, AccentEmerald, Modifier.fillMaxWidth(), onNavigateWarehouse)
                    }
                }
            }
        }
    }
}

@Composable
fun AdminModuleCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(36.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(text = subtitle, fontSize = 10.sp, color = TextMuted)
            }
        }
    }
}

@Composable
fun AdminDispatchCard(
    order: Order,
    volunteers: List<VolunteerInfo>,
    onAssign: (volunteerUserId: Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Order #${order.orderNumber}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PrimaryCyan)
                Text(order.status, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AccentAmber)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text("Customer: ${order.customerName}", fontSize = 12.sp, color = Color.White)
            Text("Address: ${order.shippingAddress}", fontSize = 11.sp, color = TextMuted)
            Text("Assigned: ${order.volunteerName ?: "UNASSIGNED"}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AccentEmerald)
            Spacer(modifier = Modifier.height(10.dp))

            if (volunteers.isNotEmpty() && order.status in listOf("ORDER PLACED", "Pending", "CONFIRMED")) {
                Button(
                    onClick = { expanded = true },
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("ASSIGN VOLUNTEER DISPATCHER", fontWeight = FontWeight.Bold, color = DarkBg, fontSize = 11.sp)
                }

                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    volunteers.forEach { v ->
                        DropdownMenuItem(
                            text = { Text("${v.fullName} (${v.vehicleType ?: "Bike"})") },
                            onClick = {
                                expanded = false
                                onAssign(v.userId)
                            }
                        )
                    }
                }
            }
        }
    }
}
