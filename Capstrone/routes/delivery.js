const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

/**
 * @route POST /api/delivery/location
 * Volunteer updates live coordinates during active delivery
 */
router.post('/location', authenticateToken, requireRole('volunteer'), async (req, res) => {
    try {
        const { orderId, latitude, longitude, speed = 0.0, status = 'EN_ROUTE' } = req.body;
        const volunteerUserId = req.user.userId;

        if (!orderId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Order ID, latitude, and longitude are required.' });
        }

        // Verify volunteer is assigned to this order
        const order = await db.get(`SELECT * FROM Orders WHERE OrderID = ? AND VolunteerUserID = ?`, [orderId, volunteerUserId]);
        if (!order) {
            return res.status(403).json({ error: 'Not authorized to update delivery location for this order.' });
        }

        await db.run(
            `INSERT INTO DeliveryLocations (OrderID, VolunteerUserID, Latitude, Longitude, Speed, Status, UpdatedAt)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [orderId, volunteerUserId, latitude, longitude, speed, status]
        );

        // Broadcast Socket.IO update if available
        if (req.app.get('io')) {
            req.app.get('io').emit(`delivery_location_${orderId}`, {
                orderId,
                volunteerUserId,
                latitude,
                longitude,
                speed,
                status,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ message: 'Live delivery location updated successfully.' });
    } catch (err) {
        console.error('Error updating delivery location:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/delivery/track/:orderId
 * Customer or Admin tracks live delivery location for an active order
 */
router.get('/track/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const user = req.user;

        const order = await db.get(
            `SELECT o.*, u.FullName as VolunteerName, u.Phone as VolunteerPhone
             FROM Orders o
             LEFT JOIN Users u ON o.VolunteerUserID = u.UserID
             WHERE o.OrderID = ?`,
            [orderId]
        );

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Authorization check: only customer of the order, assigned volunteer, or admin can track
        const isCustomer = user.customerKey && user.customerKey === order.CustomerKey;
        const isAssignedVolunteer = user.userId === order.VolunteerUserID;
        const isAdmin = user.role === 'admin';

        if (!isCustomer && !isAssignedVolunteer && !isAdmin) {
            return res.status(403).json({ error: 'Access denied to order delivery tracking.' });
        }

        const latestLocation = await db.get(
            `SELECT * FROM DeliveryLocations WHERE OrderID = ? ORDER BY LocationID DESC LIMIT 1`,
            [orderId]
        );

        // Fallback default coordinates near depot if no tracking yet
        const defaultVolunteerLat = 17.4150;
        const defaultVolunteerLng = 78.4490;

        res.json({
            orderId: order.OrderID,
            orderNumber: order.OrderNumber,
            status: order.Status,
            customerName: order.CustomerName,
            shippingAddress: order.ShippingAddress,
            destinationLatitude: order.ShippingLatitude || 17.4126,
            destinationLongitude: order.ShippingLongitude || 78.4482,
            volunteer: {
                name: order.VolunteerName || 'Assigned Volunteer',
                phone: order.VolunteerPhone || '9876543210',
                latitude: latestLocation ? latestLocation.Latitude : defaultVolunteerLat,
                longitude: latestLocation ? latestLocation.Longitude : defaultVolunteerLng,
                speed: latestLocation ? latestLocation.Speed : 0.0,
                lastUpdated: latestLocation ? latestLocation.UpdatedAt : order.CreatedAt
            }
        });
    } catch (err) {
        console.error('Error tracking order location:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
