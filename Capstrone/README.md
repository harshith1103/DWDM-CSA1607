# SHOPLYTICS — E-Commerce Recommendation & Customer Behavior Analytics

> **"Shop Smarter. Understand Better."**

Academic Project: **E-Commerce Recommendation and Customer Behavior Analytics using Data Warehouse, Apriori Mining and BI Tools**

---

## 🌟 Academic Concept Highlights

1. **Data Warehouse Layer**:
   - **Star Schema**: `FactSales` central fact table connected to `DimCustomer`, `DimProduct`, `DimDate`, `DimBehavior`.
   - **Snowflake Schema**: Normalized dimensional hierarchies (`DimProduct` ➔ `DimCategory` ➔ `DimSubcategory` ➔ `DimBrand`).
   - **ETL Pipeline**: Extract ➔ Transform ➔ Load pipeline refreshing warehouse metrics.

2. **Apriori Association Rule Mining Engine**:
   - Mines frequent 1-itemsets, 2-itemsets, and 3-itemsets across customer market baskets.
   - Calculates **Support** $P(A \cap B)$, **Confidence** $P(B|A)$, and **Lift** $\frac{P(A \cap B)}{P(A) \cdot P(B)}$.
   - Drives personalized **"Frequently Bought Together"** cross-sell recommendations with human-readable explanations.

3. **Interactive OLAP Engine**:
   - Supports 5 core dimensional cube operations:
     - **ROLL-UP**: Aggregates sales metrics from Month ➔ Year level.
     - **DRILL-DOWN**: Navigates from Year ➔ Month ➔ Day granular trend.
     - **SLICE**: Filters cube on a specific category (e.g., `Electronics`).
     - **DICE**: Cross-filters multiple dimensions simultaneously (`Category` $\times$ `Region`).
     - **PIVOT**: Transposes dimensions into Quarter-by-Quarter comparison matrix.

4. **RFM Customer Segmentation**:
   - Clusters customers based on **Recency** (days since last purchase), **Frequency** (total transactions), and **Monetary** (total spending).
   - Segments: *Champions*, *Loyal Customers*, *Potential Loyalists*, *At Risk*, and *Lost Customers*.

5. **Logistics & Live Google Maps Tracking**:
   - Tracks customer delivery addresses with interactive **Google Maps Satellite Embed** and turn-by-turn navigation links.

---

## 📱 Technology Stack

### Native Android Application (`android/`)
- **Language**: Kotlin 1.9
- **UI Framework**: Jetpack Compose + Material 3 (Shoplytics Dark Theme)
- **Architecture**: MVVM + Clean Architecture (`data/`, `domain/`, `presentation/`, `core/`)
- **Networking**: Retrofit 2 + Gson + OkHttp3
- **Local Cache**: Room Database + DataStore
- **Navigation**: Jetpack Navigation Compose

### Backend API & Data Warehouse (`Capstrone/`)
- **Runtime**: Node.js + Express.js
- **Database**: SQLite Data Warehouse (`database/warehouse.db`)
- **Security**: JWT authentication + bcrypt password hashing
- **Reporting**: PDFKit (PDF generation) + ExcelJS (Excel .xlsx / CSV export)

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@shoplytics.com` | `customer123` | Store Catalog, Ratings & Reviews, Cart, Checkout, Order Tracking |
| **Admin** | `admin@shoplytics.com` | `admin123` | BI Analytics, ETL Control, Order Dispatcher, Volunteer Assignment |
| **Volunteer** | `volunteer@shoplytics.com` | `volunteer123` | Volunteer Logistics Portal, Pickup/Delivery Address Management |

---

## 🚀 How to Run

### 1. Start the Backend API Server
Open terminal in the project folder:
```powershell
cd Capstrone
npm start
```
The server will start at: **`http://localhost:3000`**

### 2. Open Android App in Android Studio
1. Launch Android Studio.
2. Open the directory: `c:\Users\narra\Desktop\DWDM\Capstrone\android`
3. Sync Gradle and click **Run 'app'** (Shift + F10) on an emulator or physical device.

---

## 🌐 API Route Reference

- `GET /api/products` — Product catalog listing with search, filtering, and sorting
- `POST /api/events/track` — Log customer behavioral events (`CustomerEvent`)
- `POST /api/apriori/mine` — Execute Apriori Mining Engine with custom thresholds
- `GET /api/apriori/rules` — Mined association rules with Support, Confidence, Lift
- `POST /api/olap/query` — Execute OLAP Cube operations (`ROLLUP`, `DRILLDOWN`, `SLICE`, `DICE`, `PIVOT`)
- `GET /api/warehouse/schema` — Star Schema & Snowflake Schema metadata
- `GET /api/warehouse/marts/customer` — Customer Data Mart
- `GET /api/warehouse/marts/product` — Product Data Mart
- `GET /api/reports/pdf` — Download Executive PDF Report
- `GET /api/reports/excel` — Export Excel .xlsx Data File
