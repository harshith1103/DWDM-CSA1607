-- Shoplytics Star Schema Data Warehouse & Operational Database

PRAGMA foreign_keys = ON;

-- Dimension Tables
CREATE TABLE IF NOT EXISTS DimCustomer (
    CustomerKey INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerID TEXT UNIQUE NOT NULL,
    FullName TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Age INTEGER,
    Gender TEXT,
    Region TEXT,
    SignupDate TEXT,
    CustomerSegment TEXT DEFAULT 'Standard'
);

CREATE TABLE IF NOT EXISTS DimProduct (
    ProductKey INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductID TEXT UNIQUE NOT NULL,
    ProductName TEXT NOT NULL,
    Brand TEXT DEFAULT 'Shoplytics',
    Category TEXT NOT NULL,
    Price REAL NOT NULL,
    OriginalPrice REAL DEFAULT 0.0,
    Discount REAL DEFAULT 0.0,
    Cost REAL NOT NULL,
    StockQuantity INTEGER DEFAULT 100,
    PopularityRating REAL DEFAULT 4.5,
    Description TEXT DEFAULT '',
    Specifications TEXT DEFAULT '',
    ImageURL TEXT
);

CREATE TABLE IF NOT EXISTS DimDate (
    DateKey INTEGER PRIMARY KEY,
    FullDate TEXT NOT NULL,
    DayOfWeek TEXT NOT NULL,
    Month TEXT NOT NULL,
    Quarter INTEGER NOT NULL,
    Year INTEGER NOT NULL,
    IsWeekend INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS DimBehavior (
    SessionID TEXT PRIMARY KEY,
    CustomerKey INTEGER,
    StartTime TEXT NOT NULL,
    SessionDurationSec INTEGER DEFAULT 0,
    PageViews INTEGER DEFAULT 1,
    CartAdditions INTEGER DEFAULT 0,
    AbandonedCart INTEGER DEFAULT 0,
    DeviceType TEXT DEFAULT 'Desktop',
    ReferralSource TEXT DEFAULT 'Direct',
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Fact Table
CREATE TABLE IF NOT EXISTS FactSales (
    SalesKey INTEGER PRIMARY KEY AUTOINCREMENT,
    TransactionID TEXT NOT NULL,
    CustomerKey INTEGER NOT NULL,
    ProductKey INTEGER NOT NULL,
    DateKey INTEGER NOT NULL,
    Quantity INTEGER NOT NULL,
    UnitPrice REAL NOT NULL,
    Discount REAL DEFAULT 0.0,
    TotalAmount REAL NOT NULL,
    SessionID TEXT,
    PaymentMethod TEXT DEFAULT 'Credit Card',
    Channel TEXT DEFAULT 'Web',
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey),
    FOREIGN KEY (ProductKey) REFERENCES DimProduct(ProductKey),
    FOREIGN KEY (DateKey) REFERENCES DimDate(DateKey)
);

-- System Users & Auth Table
CREATE TABLE IF NOT EXISTS Users (
    UserID INTEGER PRIMARY KEY AUTOINCREMENT,
    Email TEXT UNIQUE NOT NULL,
    PasswordHash TEXT NOT NULL,
    Role TEXT CHECK(Role IN ('admin', 'customer', 'volunteer')) DEFAULT 'customer',
    CustomerKey INTEGER,
    FullName TEXT NOT NULL,
    Phone TEXT,
    Location TEXT,
    Latitude REAL,
    Longitude REAL,
    IsApproved INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Volunteers Metadata Table
CREATE TABLE IF NOT EXISTS Volunteers (
    VolunteerID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID INTEGER UNIQUE NOT NULL,
    PreferredArea TEXT,
    VehicleType TEXT,
    AvailabilityStatus TEXT CHECK(AvailabilityStatus IN ('ONLINE', 'OFFLINE')) DEFAULT 'OFFLINE',
    IsApproved INTEGER DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Customer Saved Delivery Addresses
CREATE TABLE IF NOT EXISTS CustomerAddresses (
    AddressID INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerKey INTEGER NOT NULL,
    Label TEXT DEFAULT 'HOME',
    FullName TEXT NOT NULL,
    Phone TEXT NOT NULL,
    HouseFlat TEXT NOT NULL,
    Street TEXT NOT NULL,
    Area TEXT NOT NULL,
    City TEXT NOT NULL,
    State TEXT NOT NULL,
    PostalCode TEXT NOT NULL,
    Country TEXT DEFAULT 'India',
    Latitude REAL NOT NULL,
    Longitude REAL NOT NULL,
    IsDefault INTEGER DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS CartItems (
    CartItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerKey INTEGER NOT NULL,
    ProductKey INTEGER NOT NULL,
    Quantity INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey),
    FOREIGN KEY (ProductKey) REFERENCES DimProduct(ProductKey)
);

-- Wishlist Table
CREATE TABLE IF NOT EXISTS Wishlist (
    WishlistID INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerKey INTEGER NOT NULL,
    ProductKey INTEGER NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey),
    FOREIGN KEY (ProductKey) REFERENCES DimProduct(ProductKey)
);

-- Customer Orders & Logistics Table
CREATE TABLE IF NOT EXISTS Orders (
    OrderID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderNumber TEXT UNIQUE NOT NULL,
    CustomerKey INTEGER NOT NULL,
    CustomerName TEXT NOT NULL,
    ShippingAddress TEXT NOT NULL,
    ShippingLatitude REAL,
    ShippingLongitude REAL,
    CustomerPhone TEXT DEFAULT '9876543210',
    CollectionAddress TEXT DEFAULT 'Shoplytics Central Hub, Depot 4, Hyderabad',
    Status TEXT CHECK(Status IN ('ORDER PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'COLLECTED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN REQUESTED', 'RETURNED')) DEFAULT 'ORDER PLACED',
    VolunteerUserID INTEGER,
    PaymentMethod TEXT DEFAULT 'COD',
    PaymentStatus TEXT DEFAULT 'PENDING',
    DeliveryType TEXT DEFAULT 'Standard',
    Subtotal REAL NOT NULL,
    DiscountAmount REAL DEFAULT 0.0,
    TaxAmount REAL DEFAULT 0.0,
    DeliveryFee REAL DEFAULT 0.0,
    TotalAmount REAL NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey),
    FOREIGN KEY (VolunteerUserID) REFERENCES Users(UserID)
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS OrderItems (
    OrderItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderID INTEGER NOT NULL,
    ProductKey INTEGER NOT NULL,
    Quantity INTEGER NOT NULL,
    UnitPrice REAL NOT NULL,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (ProductKey) REFERENCES DimProduct(ProductKey)
);

-- Payments Transaction Table
CREATE TABLE IF NOT EXISTS Payments (
    PaymentID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderID INTEGER NOT NULL,
    CustomerKey INTEGER NOT NULL,
    PaymentMethod TEXT CHECK(PaymentMethod IN ('COD', 'Card', 'UPI')) NOT NULL,
    Amount REAL NOT NULL,
    Status TEXT CHECK(Status IN ('SUCCESS', 'FAILED', 'PENDING')) DEFAULT 'PENDING',
    TransactionRef TEXT UNIQUE NOT NULL,
    IsDemoMode INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Product Ratings & Reviews Table
CREATE TABLE IF NOT EXISTS ProductReviews (
    ReviewID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductKey INTEGER NOT NULL,
    CustomerKey INTEGER NOT NULL,
    Rating INTEGER CHECK(Rating BETWEEN 1 AND 5) NOT NULL,
    Comment TEXT,
    IsVerifiedPurchase INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProductKey) REFERENCES DimProduct(ProductKey),
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Volunteer Ratings & Reviews Table
CREATE TABLE IF NOT EXISTS VolunteerReviews (
    VolunteerReviewID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderID INTEGER NOT NULL,
    VolunteerUserID INTEGER NOT NULL,
    CustomerKey INTEGER NOT NULL,
    Rating INTEGER CHECK(Rating BETWEEN 1 AND 5) NOT NULL,
    Comment TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (VolunteerUserID) REFERENCES Users(UserID),
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Association Rules Table (Apriori Results)
CREATE TABLE IF NOT EXISTS AssociationRules (
    RuleID INTEGER PRIMARY KEY AUTOINCREMENT,
    Antecedents TEXT NOT NULL,
    Consequents TEXT NOT NULL,
    Support REAL NOT NULL,
    Confidence REAL NOT NULL,
    Lift REAL NOT NULL,
    RuleStrength TEXT DEFAULT 'Strong',
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Search History Table
CREATE TABLE IF NOT EXISTS SearchHistory (
    SearchID INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerKey INTEGER NOT NULL,
    Query TEXT NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerKey) REFERENCES DimCustomer(CustomerKey)
);

-- Realtime Delivery Location Tracking Table
CREATE TABLE IF NOT EXISTS DeliveryLocations (
    LocationID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderID INTEGER NOT NULL,
    VolunteerUserID INTEGER NOT NULL,
    Latitude REAL NOT NULL,
    Longitude REAL NOT NULL,
    Speed REAL DEFAULT 0.0,
    Status TEXT DEFAULT 'EN_ROUTE',
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (VolunteerUserID) REFERENCES Users(UserID)
);

-- Realtime Activity Tracking Table
CREATE TABLE IF NOT EXISTS RealTimeActivity (
    ActivityID INTEGER PRIMARY KEY AUTOINCREMENT,
    SessionID TEXT NOT NULL,
    CustomerKey INTEGER,
    EventType TEXT NOT NULL,
    EventData TEXT,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Data Warehouse Performance & OLAP Analytics
CREATE INDEX IF NOT EXISTS idx_fact_sales_date ON FactSales(DateKey);
CREATE INDEX IF NOT EXISTS idx_fact_sales_customer ON FactSales(CustomerKey);
CREATE INDEX IF NOT EXISTS idx_fact_sales_product ON FactSales(ProductKey);
CREATE INDEX IF NOT EXISTS idx_fact_sales_transaction ON FactSales(TransactionID);
CREATE INDEX IF NOT EXISTS idx_behavior_customer ON DimBehavior(CustomerKey);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON Orders(CustomerKey);
CREATE INDEX IF NOT EXISTS idx_orders_volunteer ON Orders(VolunteerUserID);
