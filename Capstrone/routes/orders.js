const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

/**
 * @route POST /api/orders
 * Customer places a new order with selected delivery address & payment method
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { shippingAddress, customerPhone, shippingLatitude, shippingLongitude, paymentMethod = 'COD', deliveryType = 'Standard', items } = req.body;
        let customerKey = req.user.customerKey;
        const customerName = req.user.fullName || 'Customer';

        if (!shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Delivery shipping address and at least one item are required.' });
        }

        // Validate customerKey against DimCustomer
        let validCust = null;
        if (customerKey) {
            validCust = await db.get(`SELECT CustomerKey FROM DimCustomer WHERE CustomerKey = ?`, [customerKey]);
        }

        if (!validCust && req.user.email) {
            validCust = await db.get(`SELECT CustomerKey FROM DimCustomer WHERE Email = ?`, [req.user.email]);
        }

        if (!validCust) {
            const custID = `CUST-${Date.now().toString().slice(-6)}-${req.user.userId || 'GEN'}`;
            const newCust = await db.run(
                `INSERT INTO DimCustomer (CustomerID, FullName, Email, SignupDate, CustomerSegment)
                 VALUES (?, ?, ?, ?, 'Standard')`,
                [custID, req.user.fullName || 'Customer', req.user.email || `user${req.user.userId}@gmail.com`, new Date().toISOString().split('T')[0]]
            );
            customerKey = newCust.lastID;
        } else {
            customerKey = validCust.CustomerKey;
        }

        if (req.user.userId) {
            await db.run(`UPDATE Users SET CustomerKey = ? WHERE UserID = ?`, [customerKey, req.user.userId]);
        }

        let subtotal = 0;
        const resolvedItems = [];
        for (const item of items) {
            const prod = await db.get(
                `SELECT ProductKey, ProductID, Price, StockQuantity FROM DimProduct WHERE ProductKey = ? OR ProductID = ?`,
                [item.productKey || item.productID, item.productKey || item.productID]
            );
            if (!prod) {
                return res.status(404).json({ error: `Product item ${item.productKey || item.productID} not found in catalog.` });
            }
            if (prod.StockQuantity < item.quantity) {
                return res.status(400).json({ error: `Product item is out of stock.` });
            }
            subtotal += prod.Price * item.quantity;
            resolvedItems.push({
                productKey: prod.ProductKey,
                productID: prod.ProductID,
                quantity: item.quantity,
                price: prod.Price
            });
        }

        const deliveryFee = deliveryType === 'Express' ? 15.0 : 5.0;
        const taxAmount = Number((subtotal * 0.05).toFixed(2));
        const totalAmount = Number((subtotal + deliveryFee + taxAmount).toFixed(2));

        const orderNumber = `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
        const collectionAddress = 'Shoplytics Central Hub, Depot 4, Hyderabad';
        const paymentStatus = paymentMethod.toUpperCase().includes('COD') ? 'PENDING' : 'SUCCESS';

        const orderResult = await db.run(
            `INSERT INTO Orders (OrderNumber, CustomerKey, CustomerName, ShippingAddress, ShippingLatitude, ShippingLongitude, CustomerPhone, CollectionAddress, Status, PaymentMethod, PaymentStatus, DeliveryType, Subtotal, TaxAmount, DeliveryFee, TotalAmount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ORDER PLACED', ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderNumber,
                customerKey,
                customerName,
                shippingAddress,
                shippingLatitude || 17.4126,
                shippingLongitude || 78.4482,
                customerPhone || '9876543210',
                collectionAddress,
                paymentMethod,
                paymentStatus,
                deliveryType,
                subtotal,
                taxAmount,
                deliveryFee,
                totalAmount
            ]
        );

        const orderId = orderResult.lastID;

        // Create Payment record with normalized PaymentMethod (COD, Card, or UPI) to satisfy table check constraint
        const normalizedPaymentMethod = paymentMethod.toUpperCase().includes('CARD') ? 'Card' 
            : (paymentMethod.toUpperCase().includes('UPI') ? 'UPI' : 'COD');

        const transactionRef = `PAY-${Date.now()}-${orderNumber}`;
        await db.run(
            `INSERT INTO Payments (OrderID, CustomerKey, PaymentMethod, Amount, Status, TransactionRef, IsDemoMode)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [orderId, customerKey, normalizedPaymentMethod, totalAmount, paymentStatus, transactionRef]
        );

        // Ensure DimDate entry for today's DateKey exists for FactSales Foreign Key
        const fullDateStr = new Date().toISOString().split('T')[0];
        const dateKey = parseInt(fullDateStr.replace(/-/g, ''));
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        await db.run(
            `INSERT OR IGNORE INTO DimDate (DateKey, FullDate, DayOfWeek, Month, Quarter, Year, IsWeekend)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                dateKey,
                fullDateStr,
                days[now.getDay()],
                months[now.getMonth()],
                Math.ceil((now.getMonth() + 1) / 3),
                now.getFullYear(),
                (now.getDay() === 0 || now.getDay() === 6) ? 1 : 0
            ]
        );

        // Insert Order Items and update StockQuantity in DimProduct & FactSales record
        for (const item of resolvedItems) {
            await db.run(
                `INSERT INTO OrderItems (OrderID, ProductKey, Quantity, UnitPrice) VALUES (?, ?, ?, ?)`,
                [orderId, item.productKey, item.quantity, item.price]
            );

            await db.run(
                `UPDATE DimProduct SET StockQuantity = MAX(0, StockQuantity - ?) WHERE ProductKey = ?`,
                [item.quantity, item.productKey]
            );

            // Record into FactSales for Data Warehouse
            await db.run(
                `INSERT INTO FactSales (TransactionID, CustomerKey, ProductKey, DateKey, Quantity, UnitPrice, TotalAmount, Channel)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderNumber, customerKey, item.productKey, dateKey, item.quantity, item.price, item.price * item.quantity, 'Mobile App']
            );
        }

        // Clear customer cart after successful order creation
        await db.run(`DELETE FROM CartItems WHERE CustomerKey = ?`, [customerKey]);

        // Broadcast Socket.IO event if available
        if (req.app.get('io')) {
            req.app.get('io').emit('new_order_placed', { orderId, orderNumber, customerName, totalAmount });
        }

        res.status(201).json({
            message: 'Order placed successfully!',
            order: {
                orderId,
                orderNumber,
                transactionRef,
                subtotal,
                deliveryFee,
                taxAmount,
                totalAmount,
                status: 'ORDER PLACED',
                paymentMethod,
                paymentStatus,
                shippingAddress,
                collectionAddress
            }
        });
    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/orders/my-orders
 * Customer views order history and delivery status
 */
router.get('/my-orders', async (req, res) => {
    try {
        let authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1];
        let reqUser = null;
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const JWT_SECRET = process.env.JWT_SECRET || 'shoplytics_secret_jwt_key_2026';
                reqUser = jwt.verify(token, JWT_SECRET);
            } catch (e) {}
        }

        const role = reqUser ? (reqUser.role || '').toLowerCase() : 'guest';
        const customerKey = reqUser ? reqUser.customerKey : null;
        const isAdminOrVolunteer = (role === 'admin' || role === 'volunteer' || role === 'guest');

        let orders = [];
        if (isAdminOrVolunteer || !customerKey) {
            orders = await db.query(
                `SELECT o.*, u.FullName as VolunteerName, u.Phone as VolunteerPhone, c.FullName as CustomerName, c.Email as CustomerEmail
                 FROM Orders o
                 LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
                 LEFT JOIN DimCustomer c ON o.CustomerKey = c.CustomerKey
                 ORDER BY o.CreatedAt DESC`
            );
        } else {
            orders = await db.query(
                `SELECT o.*, u.FullName as VolunteerName, u.Phone as VolunteerPhone, c.FullName as CustomerName, c.Email as CustomerEmail
                 FROM Orders o
                 LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
                 LEFT JOIN DimCustomer c ON o.CustomerKey = c.CustomerKey
                 WHERE o.CustomerKey = ?
                 ORDER BY o.CreatedAt DESC`,
                [customerKey]
            );
        }

        for (const order of orders) {
            const items = await db.query(
                `SELECT i.*, p.ProductName, p.Brand, p.ImageURL
                 FROM OrderItems i
                 JOIN DimProduct p ON i.ProductKey = p.ProductKey
                 WHERE i.OrderID = ?`,
                [order.OrderID]
            );
            order.items = items;

            const feedback = await db.get(
                `SELECT VolunteerReviewID FROM VolunteerReviews WHERE OrderID = ? AND CustomerKey = ?`,
                [order.OrderID, order.CustomerKey || customerKey]
            );
            order.hasSubmittedFeedback = !!feedback;
        }

        res.json(orders);
    } catch (err) {
        console.error('Error fetching customer orders:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/orders/:orderId/cancel
 * Cancel order if eligible (ORDER PLACED or CONFIRMED)
 */
router.post('/:orderId/cancel', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const customerKey = req.user.customerKey;

        const order = await db.get(`SELECT * FROM Orders WHERE OrderID = ? AND CustomerKey = ?`, [orderId, customerKey]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (!['ORDER PLACED', 'CONFIRMED'].includes(order.Status)) {
            return res.status(400).json({ error: `Cannot cancel order in '${order.Status}' state.` });
        }

        await db.run(`UPDATE Orders SET Status = 'CANCELLED' WHERE OrderID = ?`, [orderId]);
        res.json({ message: `Order #${order.OrderNumber} cancelled successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/orders/:orderId/return
 * Request product return if eligible (DELIVERED)
 */
router.post('/:orderId/return', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const customerKey = req.user.customerKey;

        const order = await db.get(`SELECT * FROM Orders WHERE OrderID = ? AND CustomerKey = ?`, [orderId, customerKey]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (order.Status !== 'DELIVERED') {
            return res.status(400).json({ error: 'Returns can only be requested for delivered orders.' });
        }

        await db.run(`UPDATE Orders SET Status = 'RETURN REQUESTED' WHERE OrderID = ?`, [orderId]);
        res.json({ message: `Return request submitted for Order #${order.OrderNumber}. Pickup scheduled.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/orders/admin
 * Admin views all orders with customer & volunteer assignments
 */
router.get('/admin', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const orders = await db.query(
            `SELECT o.*, u.FullName as VolunteerName, u.Email as VolunteerEmail, u.Phone as VolunteerPhone
             FROM Orders o
             LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
             ORDER BY o.CreatedAt DESC`
        );

        for (const order of orders) {
            const items = await db.query(
                `SELECT i.*, p.ProductName, p.Brand
                 FROM OrderItems i
                 JOIN DimProduct p ON i.ProductKey = p.ProductKey
                 WHERE i.OrderID = ?`,
                [order.OrderID]
            );
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        console.error('Error fetching admin orders:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/orders/:orderId/assign
 * Admin assigns volunteer to order
 */
router.put('/:orderId/assign', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { volunteerUserId } = req.body;

        if (!volunteerUserId) {
            return res.status(400).json({ error: 'Volunteer User ID is required.' });
        }

        const volunteer = await db.get(`SELECT UserID, FullName FROM Users WHERE UserID = ? AND Role = 'volunteer'`, [volunteerUserId]);
        if (!volunteer) {
            return res.status(404).json({ error: 'Volunteer user not found.' });
        }

        await db.run(
            `UPDATE Orders SET VolunteerUserID = ?, Status = 'SHIPPED' WHERE OrderID = ?`,
            [volunteerUserId, orderId]
        );

        res.json({
            message: `Order #${orderId} assigned to volunteer ${volunteer.FullName}`,
            volunteerName: volunteer.FullName
        });
    } catch (err) {
        console.error('Error assigning volunteer:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/orders/:orderId/accept
 * Volunteer claims/accepts an unassigned delivery order
 */
router.put('/:orderId/accept', authenticateToken, requireRole('volunteer'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const volunteerUserId = req.user.userId;

        const userRow = await db.get(`SELECT FullName FROM Users WHERE UserID = ?`, [volunteerUserId]);
        const volunteerName = userRow ? userRow.FullName : 'Volunteer Agent';

        await db.run(
            `UPDATE Orders SET VolunteerUserID = ?, Status = 'SHIPPED' WHERE OrderID = ?`,
            [volunteerUserId, orderId]
        );

        res.json({
            message: `Order #${orderId} claimed successfully by ${volunteerName}`,
            volunteerName
        });
    } catch (err) {
        console.error('Error accepting delivery order:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/orders/volunteer
 * Volunteer views assigned & active unassigned delivery tasks
 */
router.get('/volunteer', authenticateToken, async (req, res) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        if (role !== 'volunteer' && role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Volunteer or Admin role required.' });
        }

        const volunteerUserId = req.user.userId;
        const isAdmin = (role === 'admin');

        let orders = [];

        if (isAdmin) {
            orders = await db.query(
                `SELECT o.*, c.FullName as CustomerFullName, c.Email as CustomerEmail, u.FullName as VolunteerName, u.Phone as VolunteerPhone
                 FROM Orders o
                 LEFT JOIN DimCustomer c ON o.CustomerKey = c.CustomerKey
                 LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
                 ORDER BY o.CreatedAt DESC`
            );
        } else {
            orders = await db.query(
                `SELECT o.*, c.FullName as CustomerFullName, c.Email as CustomerEmail, u.FullName as VolunteerName, u.Phone as VolunteerPhone
                 FROM Orders o
                 LEFT JOIN DimCustomer c ON o.CustomerKey = c.CustomerKey
                 LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
                 WHERE (o.VolunteerUserID = ? OR o.VolunteerUserID IS NULL OR o.VolunteerUserID = 0)
                   AND o.Status NOT IN ('CANCELLED', 'RETURNED')
                 ORDER BY CASE 
                    WHEN o.VolunteerUserID = ? AND o.Status = 'OUT FOR DELIVERY' THEN 1
                    WHEN o.VolunteerUserID = ? AND o.Status = 'COLLECTED' THEN 2
                    WHEN o.VolunteerUserID = ? AND o.Status = 'SHIPPED' THEN 3
                    WHEN (o.VolunteerUserID IS NULL OR o.VolunteerUserID = 0) THEN 4
                    WHEN o.VolunteerUserID = ? AND o.Status = 'DELIVERED' THEN 5
                    ELSE 6 END, o.CreatedAt DESC`,
                [volunteerUserId, volunteerUserId, volunteerUserId, volunteerUserId, volunteerUserId]
            );
        }

        for (const order of orders) {
            const items = await db.query(
                `SELECT i.*, p.ProductName, p.Brand, p.ImageURL
                 FROM OrderItems i
                 JOIN DimProduct p ON i.ProductKey = p.ProductKey
                 WHERE i.OrderID = ?`,
                [order.OrderID]
            );
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        console.error('Error fetching volunteer orders:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/orders/:orderId/status
 * Volunteer updates delivery status ('OUT FOR DELIVERY', 'DELIVERED')
 */
router.put('/:orderId/status', authenticateToken, requireRole('volunteer'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const allowed = ['CONFIRMED', 'PACKED', 'SHIPPED', 'COLLECTED', 'OUT FOR DELIVERY', 'DELIVERED'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}.` });
        }

        const paymentStatus = status === 'DELIVERED' ? 'SUCCESS' : undefined;
        if (paymentStatus) {
            await db.run(
                `UPDATE Orders SET Status = ?, PaymentStatus = ? WHERE OrderID = ? AND VolunteerUserID = ?`,
                [status, paymentStatus, orderId, req.user.userId]
            );
        } else {
            await db.run(
                `UPDATE Orders SET Status = ? WHERE OrderID = ? AND VolunteerUserID = ?`,
                [status, orderId, req.user.userId]
            );
        }

        // Broadcast Socket.IO update if available
        if (req.app.get('io')) {
            req.app.get('io').emit(`order_status_updated`, {
                orderId,
                status,
                volunteerUserId: req.user.userId,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ message: `Order #${orderId} status updated to ${status}` });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
