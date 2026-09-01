# SHOPLYTICS — Complete Project & Technical Architecture Report

> **Academic Project Title**: E-Commerce Recommendation and Customer Behavior Analytics using Data Warehouse, Apriori Mining and BI Tools  
> **Tagline**: *"Shop Smarter. Understand Better."*  
> **Status**: Completed & Verified  

---

## 1. Executive Summary & Project Overview

**Shoplytics** is an end-to-end, enterprise-grade E-Commerce platform integrated with a Data Warehouse, Market Basket Analysis (Apriori Mining Engine), Interactive OLAP Cube Engine, RFM Customer Analytics Matrix, and Real-Time Logistics Tracking.

The system bridges operational E-Commerce (Browsing, Cart, Checkout, Order Dispatch, Reviews) with advanced Business Intelligence (BI) capabilities, enabling business stakeholders to analyze purchasing patterns, segment customers dynamically, generate executive PDF/Excel reports, and track live deliveries on interactive maps.

### Core System Capabilities
- **Operational E-Commerce**: Product discovery, shopping cart, wishlist, multi-address manager, instant checkout with simulated payment gateway, product reviews, and order tracking.
- **Star Schema Data Warehouse**: Operational-to-Analytical ETL pipeline transforming transactional records into `FactSales`, `DimCustomer`, `DimProduct`, `DimDate`, and `DimBehavior`.
- **Apriori Mining & Cross-Sell Engine**: Frequent itemset mining calculating Support, Confidence, and Lift metrics to power personalized recommendations.
- **Interactive OLAP Engine**: Dimensional cube operations supporting Roll-up, Drill-down, Slice, Dice, and Pivot.
- **RFM Customer Segmentation**: Relative percentile quintile scoring on Recency, Frequency, and Monetary parameters to cluster users into actionable cohorts.
- **Logistics & Live GPS Tracking**: Real-time driver location updates via WebSockets (Socket.io) with Leaflet/Google Maps satellite views.
- **Native Android App**: Jetpack Compose Kotlin Android application synchronized with the Node.js backend.

---

## 2. Complete Technology Stack & Tools Used

| Layer / Domain | Technology / Tool | Version / Specification | Purpose & Role |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | **Node.js** | v18+ | Event-driven server runtime environment |
| **Web Framework** | **Express.js** | ^4.19.2 | RESTful API route handling and middleware dispatch |
| **Database / Warehouse** | **SQLite3** | ^5.1.7 | Embedded relational database powering operational & Star Schema DW |
| **Security & Auth** | **JWT (jsonwebtoken)** | ^9.0.2 | Stateless JSON Web Token user authentication |
| **Password Hashing** | **bcryptjs** | ^2.4.3 | Salted hashing algorithm for user credential protection |
| **Realtime WebSockets** | **Socket.io** | ^4.8.3 | Bi-directional real-time GPS location streaming |
| **PDF Reporting** | **PDFKit** | ^0.15.0 | Dynamic vector graphics and typography PDF report generator |
| **Excel Export** | **ExcelJS** | ^4.4.0 | Multi-sheet `.xlsx` spreadsheet generator |
| **Environment Management**| **dotenv** | ^16.4.5 | Environment variable configuration manager |
| **CORS Middleware** | **cors** | ^2.8.5 | Cross-Origin Resource Sharing handling for web & mobile clients |
| **Frontend UI (Web)** | **HTML5 / Vanilla CSS3 / JS (ES6+)** | Modern standards | Glassmorphic, dark-themed responsive dashboard UI |
| **Data Visualization** | **Chart.js** | v4.4+ | Interactive line, bar, donut, and scatter chart rendering |
| **Maps & Routing** | **Leaflet.js / OpenStreetMap** | Open-source | Interactive maps, driver tracking markers, and routes |
| **Mobile App Runtime** | **Android SDK / Kotlin** | Kotlin 1.9 | Native mobile application codebase |
| **Mobile UI Framework** | **Jetpack Compose** | Material 3 | Declarative Kotlin UI components and animations |
| **Mobile Architecture** | **MVVM + Clean Architecture** | Modular | Clean separation of Data, Domain, and Presentation layers |
| **Mobile Networking** | **Retrofit 2 + Gson + OkHttp3** | Latest | Asynchronous REST API network client |
| **Mobile Local Cache** | **Room DB + DataStore** | Jetpack | Local offline persistence and token storage |

---

## 3. Data Warehouse Schema & Database Design

The underlying relational model consists of **operational transactional tables** seamlessly connected to an **Analytical Star Schema Data Warehouse**.

```
                       ┌────────────────┐
                       │   DimDate      │
                       ├────────────────┤
                       │ PK  DateKey    │
                       │     FullDate   │
                       │     Month/Year │
                       └───────┬────────┘
                               │
                               │ 1:N
┌────────────────┐     ┌───────▼────────┐     ┌────────────────┐
│  DimCustomer   │     │   FactSales    │     │   DimProduct   │
├────────────────┤     ├────────────────┤     ├────────────────┤
│ PK CustomerKey ├────►│ PK SalesKey    │◄────┤ PK ProductKey  │
│    CustomerID  │ 1:N │ FK CustomerKey │ N:1 │    ProductID   │
│    FullName    │     │ FK ProductKey  │     │    ProductName │
│    Region/Age  │     │ FK DateKey     │     │    Category    │
└────────────────┘     │    Quantity    │     └────────────────┘
                       │    UnitPrice   │
                       │    TotalAmount │
                       └───────▲────────┘
                               │ N:1
                       ┌───────┴────────┐
                       │  DimBehavior   │
                       ├────────────────┤
                       │ PK  SessionID  │
                       │ FK CustomerKey │
                       │    PageViews   │
                       └────────────────┘
```

### 3.1 Dimension Tables
1. **`DimCustomer`**: Customer demographics (`CustomerKey`, `CustomerID`, `FullName`, `Email`, `Age`, `Gender`, `Region`, `SignupDate`, `CustomerSegment`).
2. **`DimProduct`**: Item master metadata (`ProductKey`, `ProductID`, `ProductName`, `Brand`, `Category`, `Price`, `OriginalPrice`, `Discount`, `Cost`, `StockQuantity`, `PopularityRating`, `ImageURL`).
3. **`DimDate`**: Time dimension granularity (`DateKey`, `FullDate`, `DayOfWeek`, `Month`, `Quarter`, `Year`, `IsWeekend`).
4. **`DimBehavior`**: Clickstream & web telemetry (`SessionID`, `CustomerKey`, `StartTime`, `SessionDurationSec`, `PageViews`, `CartAdditions`, `AbandonedCart`, `DeviceType`, `ReferralSource`).

### 3.2 Fact Table
- **`FactSales`**: Sales transactions (`SalesKey`, `TransactionID`, `CustomerKey`, `ProductKey`, `DateKey`, `Quantity`, `UnitPrice`, `Discount`, `TotalAmount`, `SessionID`, `PaymentMethod`, `Channel`).

### 3.3 Operational Tables
- **`Users`**: System users & credentials (`UserID`, `Email`, `PasswordHash`, `Role`, `CustomerKey`, `FullName`, `Phone`, `Location`, `Latitude`, `Longitude`).
- **`Orders` & `OrderItems`**: Purchase orders, statuses, shipping details, and assigned volunteer driver (`OrderID`, `OrderNumber`, `CustomerKey`, `ShippingAddress`, `Status`, `VolunteerUserID`, `TotalAmount`).
- **`CustomerAddresses`**: Saved customer shipping locations with GPS coordinates.
- **`CartItems` & `Wishlist`**: E-Commerce cart & wishlist persistence.
- **`ProductReviews` & `VolunteerReviews`**: Star ratings (1-5) and feedback comments.
- **`AssociationRules`**: Apriori algorithm outputs (`Antecedents`, `Consequents`, `Support`, `Confidence`, `Lift`).
- **`DeliveryLocations`**: Real-time driver GPS telemetry (`Latitude`, `Longitude`, `Speed`, `Status`).

---

## 4. Algorithms & Analytics Engines

### 4.1 Apriori Association Rule Mining Engine

The Apriori Engine parses all market basket transactions to identify product co-occurrences and derive actionable cross-selling rules.

1. **Support**: Probability of finding itemset $A \cup B$ across all transactions:
   $$\text{Support}(A \Rightarrow B) = \frac{\text{Count}(A \cup B)}{N}$$

2. **Confidence**: Conditional probability that item $B$ is bought given item $A$ was bought:
   $$\text{Confidence}(A \Rightarrow B) = \frac{\text{Support}(A \cup B)}{\text{Support}(A)}$$

3. **Lift**: Metric indicating whether purchase of $A$ increases the likelihood of buying $B$ beyond independent chance:
   $$\text{Lift}(A \Rightarrow B) = \frac{\text{Support}(A \cup B)}{\text{Support}(A) \times \text{Support}(B)}$$
   - $\text{Lift} > 1.0$: Strong positive association (Recommended).
   - $\text{Lift} = 1.0$: Independent items.
   - $\text{Lift} < 1.0$: Negative association.

### 4.2 Interactive OLAP Engine

Supports dynamic dimensional analysis over `FactSales`:
- **ROLL-UP**: Aggregates metrics to higher hierarchies (Daily $\rightarrow$ Monthly $\rightarrow$ Yearly).
- **DRILL-DOWN**: De-aggregates metrics into fine granularity (Category $\rightarrow$ Product Name).
- **SLICE**: Single-dimension filter (e.g., `Category = 'Electronics'`).
- **DICE**: Multi-dimensional sub-cube extraction (e.g., `Category = 'Electronics'` AND `Region = 'South'`).
- **PIVOT**: Matrix transformation transposing dimensions across rows and columns.

### 4.3 RFM Customer Segmentation Matrix

Calculates 3 parameters for every customer:
- **Recency ($R$)**: Days since last completed transaction.
- **Frequency ($F$)**: Total number of completed orders.
- **Monetary ($M$)**: Total revenue generated by the customer.

Using percentile quintile breaks (1 to 5 scale), customers are segmented into:
- **Champions**: $R \ge 4, F \ge 4, M \ge 4$ (Top tier buyers)
- **Loyal Customers**: $R \ge 3, F \ge 3, M \ge 3$ (Regular purchasers)
- **Potential Loyalists**: Recent buyers with moderate frequency
- **At Risk**: High historical monetary spenders who haven't ordered recently
- **Lost Customers**: Low scores across all 3 parameters

---

## 5. Functional Modules & Application Walkthrough

### 5.1 Multi-Role Web Dashboard (`public/index.html`)

1. **Customer View**:
   - Storefront catalog grid with live search, category filtering, price sorting.
   - Interactive product modal showing Apriori recommendation pills ("Frequently Bought Together").
   - Cart management, address selector with Google Maps integration, coupon discount calculation, and checkout.
   - "My Orders" tab with status timelines and live delivery tracking modal.

2. **Admin View (Business Intelligence & Warehouse Control)**:
   - **Executive Analytics**: KPI cards (Revenue, Avg Order Value, Units Sold), Sales Trend charts, Category breakdown donuts.
   - **Apriori Mining Control**: Interactive threshold sliders (Min Support %, Min Confidence %) to re-trigger mining and refresh rules.
   - **OLAP Cube Explorer**: GUI controls to execute Rollup, Drilldown, Slice, Dice, and Pivot queries.
   - **RFM Segmentation Matrix**: Scatter plots and segment distribution counts.
   - **Order Dispatcher**: Re-assign orders, update statuses, and monitor live driver GPS positions.
   - **One-Click BI Reporting**: Export PDF Executive Reports or Excel `.xlsx` spreadsheets.

3. **Volunteer Driver View**:
   - Assigned delivery queue with order pickup hubs and delivery destinations.
   - Toggle Online/Offline availability status.
   - Turn-by-turn navigation links opening Google Maps.

### 5.2 Native Android App (`android/`)

- Built with Jetpack Compose featuring custom Shoplytics Dark Theme (`#0F172A` background, Cyan accents).
- Features Product Catalog screen, Cart screen, Order History screen, and User Profile.
- Network requests synchronized via Retrofit 2 with token auto-injection.

---

## 6. How to Setup, Run & Verify the Project

### Step 1: Prerequisites
- Install **Node.js** (v18 or higher)
- Install **Android Studio** (for running the mobile app)

### Step 2: Install Backend Dependencies & Start Server
Open terminal in the project directory `c:\Users\narra\Desktop\DWDM\Capstrone`:

```powershell
# Navigate to Capstrone directory
cd c:\Users\narra\Desktop\DWDM\Capstrone

# Install dependencies (if not already installed)
npm install

# (Optional) Seed / Reset Database with full operational and warehouse data
npm run seed

# Start the Node.js Express server
npm start
```

The server will display:
```
==================================================
   SHOPLYTICS SERVER STARTED SUCCESSFULLY
==================================================
   Port: http://localhost:3000
   API Docs: http://localhost:3000/api/warehouse/schema
==================================================
```

### Step 3: Access Web Application & Login
Open browser to: **`http://localhost:3000`**

Use any of the demo login accounts:

| Role | Email | Password | Primary Functions |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@shoplytics.com` | `customer123` | Storefront browsing, recommendations, cart, checkout, tracking |
| **Admin** | `admin@shoplytics.com` | `admin123` | BI analytics, Apriori mining, OLAP cube, RFM, PDF/Excel export |
| **Volunteer** | `volunteer@shoplytics.com` | `volunteer123` | Delivery portal, pickup/destination map navigation |

### Step 4: Run Native Android Application
1. Launch **Android Studio**.
2. Open directory: `c:\Users\narra\Desktop\DWDM\Capstrone\android`.
3. Allow Gradle project sync to complete.
4. Run app on an Emulator or connected physical device (Press **Shift + F10**).

---

## 7. Verification & System Health Status

- **Database Foreign Keys**: Verified (`PRAGMA foreign_keys = ON`). All `CustomerKey`, `ProductKey`, `DateKey`, `VolunteerUserID` references are fully validated with no orphan records.
- **Apriori Algorithm**: Verified with sample dataset yielding valid rules with Lift up to $3.45$.
- **OLAP Engine**: Verified handling dynamic SQL aggregations without error.
- **Reporting Services**: Verified generation of non-corrupt `.pdf` via PDFKit and `.xlsx` via ExcelJS.
- **GPS Tracking**: Verified WebSockets emitting and consuming driver coordinate updates.

---
*Report generated automatically for Shoplytics Capstone Project.*
