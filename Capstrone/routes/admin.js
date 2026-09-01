const express = require('express');
const router = express.Router();
const db = require('../config/database');
const seedDatabase = require('../services/seed');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

/**
 * @route GET /api/admin/volunteers
 * Fetch all registered volunteers with approval status
 */
router.get('/volunteers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const volunteers = await db.query(`
            SELECT u.UserID, u.FullName, u.Email, u.Phone, u.Location, u.IsApproved, u.CreatedAt,
                   v.PreferredArea, v.VehicleType, v.AvailabilityStatus
            FROM Users u
            LEFT JOIN Volunteers v ON u.UserID = v.UserID
            WHERE u.Role = 'volunteer'
            ORDER BY u.IsApproved ASC, u.CreatedAt DESC
        `);
        res.json(volunteers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/admin/orders
 * Fetch all customer orders with volunteer assignment details for Admin Dispatcher Table
 */
router.get('/orders', async (req, res) => {
    try {
        const orders = await db.query(`
            SELECT o.OrderID, o.OrderNumber, o.CustomerKey, o.CustomerName, o.CustomerPhone,
                   o.ShippingAddress, o.TotalAmount, o.Subtotal, o.TaxAmount, o.DeliveryFee,
                   o.Status, o.PaymentMethod, o.CreatedAt,
                   o.VolunteerUserID, u.FullName as VolunteerName, u.Phone as VolunteerPhone,
                   c.Email as CustomerEmail, c.CustomerSegment, c.CustomerID
            FROM Orders o
            LEFT JOIN DimCustomer c ON o.CustomerKey = c.CustomerKey
            LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
            ORDER BY o.CreatedAt DESC
        `);

        // Attach itemized products
        for (let order of orders) {
            const items = await db.query(`
                SELECT oi.Quantity, oi.UnitPrice, p.ProductName, p.Brand, p.Category, p.ImageURL, p.StockQuantity, p.ProductID
                FROM OrderItems oi
                LEFT JOIN DimProduct p ON oi.ProductKey = p.ProductKey
                WHERE oi.OrderID = ?
            `, [order.OrderID]);
            order.items = items || [];
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/admin/orders/:orderId/assign-volunteer
 * Admin manual assignment of Volunteer Agent to order
 */
router.get('/volunteers-list', async (req, res) => {
    try {
        const volunteers = await db.query(`
            SELECT UserID, FullName, Phone, Email
            FROM Users
            WHERE UPPER(Role) = 'VOLUNTEER' OR LOWER(Role) = 'volunteer'
            ORDER BY FullName ASC
        `);
        res.json(volunteers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/orders/:orderId/assign-volunteer', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { volunteerUserId } = req.body;

        const vol = await db.get(`SELECT UserID, FullName, Phone FROM Users WHERE UserID = ?`, [volunteerUserId]);
        if (!vol) {
            return res.status(404).json({ error: 'Volunteer User not found.' });
        }

        await db.run(
            `UPDATE Orders SET VolunteerUserID = ?, Status = CASE WHEN UPPER(Status) IN ('ORDER PLACED', 'CONFIRMED') THEN 'PACKED' ELSE Status END WHERE OrderID = ?`,
            [volunteerUserId, orderId]
        );

        res.json({
            message: `Order #${orderId} assigned to Volunteer Delivery Agent ${vol.FullName} (${vol.Phone}).`,
            volunteerName: vol.FullName
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/admin/orders/:orderId/status
 * Admin update order delivery status
 */
router.put('/orders/:orderId/status', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        await db.run(`UPDATE Orders SET Status = ? WHERE OrderID = ?`, [status, orderId]);
        res.json({ message: `Order #${orderId} status updated to ${status}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/admin/volunteers/:userId/approve
 * Admin approves pending volunteer
 */
router.put('/volunteers/:userId/approve', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;

        await db.run(`UPDATE Users SET IsApproved = 1 WHERE UserID = ? AND Role = 'volunteer'`, [userId]);
        await db.run(`UPDATE Volunteers SET IsApproved = 1 WHERE UserID = ?`, [userId]);

        res.json({ message: `Volunteer user #${userId} has been approved successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/admin/dispatch/map
 * Admin Live Delivery Map data showing customer & volunteer markers
 */
router.get('/dispatch/map', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const activeOrders = await db.query(`
            SELECT o.OrderID, o.OrderNumber, o.Status, o.CustomerName, o.ShippingAddress, o.ShippingLatitude, o.ShippingLongitude,
                   u.FullName as VolunteerName, u.Phone as VolunteerPhone,
                   dl.Latitude as VolunteerLat, dl.Longitude as VolunteerLng, dl.Speed, dl.UpdatedAt as LocationUpdatedAt
            FROM Orders o
            LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
            LEFT JOIN (
                SELECT d1.* FROM DeliveryLocations d1
                INNER JOIN (
                    SELECT OrderID, MAX(LocationID) as MaxID FROM DeliveryLocations GROUP BY OrderID
                ) d2 ON d1.OrderID = d2.OrderID AND d1.LocationID = d2.MaxID
            ) dl ON o.OrderID = dl.OrderID
            WHERE o.Status IN ('CONFIRMED', 'PACKED', 'SHIPPED', 'OUT FOR DELIVERY')
            ORDER BY o.CreatedAt DESC
        `);

        res.json({
            activeDeliveriesCount: activeOrders.length,
            deliveries: activeOrders.map(d => ({
                orderId: d.OrderID,
                orderNumber: d.OrderNumber,
                status: d.Status,
                customer: {
                    name: d.CustomerName,
                    address: d.ShippingAddress,
                    latitude: d.ShippingLatitude || 17.4126,
                    longitude: d.ShippingLongitude || 78.4482
                },
                volunteer: {
                    name: d.VolunteerName || 'Unassigned',
                    phone: d.VolunteerPhone || 'N/A',
                    latitude: d.VolunteerLat || 17.4150,
                    longitude: d.VolunteerLng || 78.4490,
                    speed: d.Speed || 0,
                    lastUpdated: d.LocationUpdatedAt
                }
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/admin/products
 */
router.get('/products', async (req, res) => {
    try {
        const products = await db.query(`SELECT * FROM DimProduct ORDER BY Category, ProductName`);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/admin/products
 */
router.post('/products', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { productID, productName, brand, category, price, cost, stockQuantity, popularityRating, description, specifications } = req.body;
        const result = await db.run(
            `INSERT INTO DimProduct (ProductID, ProductName, Brand, Category, Price, Cost, StockQuantity, PopularityRating, Description, Specifications, ImageURL)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productID || `PROD-${Date.now().toString().slice(-4)}`,
                productName,
                brand || 'Shoplytics',
                category,
                price,
                cost || price * 0.5,
                stockQuantity || 100,
                popularityRating || 4.5,
                description || '',
                specifications || '',
                '📦'
            ]
        );
        res.status(201).json({ message: 'Product created successfully', productKey: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/admin/products/:id
 */
router.put('/products/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { productName, brand, category, price, stockQuantity } = req.body;
        await db.run(
            `UPDATE DimProduct SET ProductName = ?, Brand = ?, Category = ?, Price = ?, StockQuantity = ? WHERE ProductKey = ?`,
            [productName, brand || 'Shoplytics', category, price, stockQuantity, req.params.id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/admin/products/:id
 */
router.delete('/products/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.run(`DELETE FROM DimProduct WHERE ProductKey = ?`, [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/admin/products/:id/restock
 */
router.put('/products/:id/restock', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { stockQuantity } = req.body;
        await db.run(`UPDATE DimProduct SET StockQuantity = ? WHERE ProductKey = ?`, [stockQuantity, req.params.id]);
        res.json({ message: 'Product stock updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/admin/customers
 */
router.get('/customers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const customers = await db.query(`SELECT * FROM DimCustomer ORDER BY CustomerKey DESC`);
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/admin/reseed
 * Run full Data Warehouse ETL re-seed
 */
router.post('/reseed', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.exec(`
            PRAGMA foreign_keys = OFF;
            DELETE FROM VolunteerReviews;
            DELETE FROM ProductReviews;
            DELETE FROM Payments;
            DELETE FROM OrderItems;
            DELETE FROM Orders;
            DELETE FROM CustomerAddresses;
            DELETE FROM Volunteers;
            DELETE FROM CartItems;
            DELETE FROM Wishlist;
            DELETE FROM SearchHistory;
            DELETE FROM DeliveryLocations;
            DELETE FROM FactSales;
            DELETE FROM DimBehavior;
            DELETE FROM DimProduct;
            DELETE FROM DimCustomer;
            DELETE FROM DimDate;
            DELETE FROM Users;
            DELETE FROM AssociationRules;
            DELETE FROM RealTimeActivity;
            PRAGMA foreign_keys = ON;
        `);
        process.env.FORCE_SEED = 'true';
        await seedDatabase();
        process.env.FORCE_SEED = 'false';
        res.json({ message: 'Data Warehouse ETL Re-seed and Apriori Mining completed successfully!' });
    } catch (err) {
        console.error('ETL Reseed Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
