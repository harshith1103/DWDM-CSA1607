const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route GET /api/addresses
 * Fetch customer's saved delivery addresses
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        if (!customerKey) {
            return res.status(400).json({ error: 'Customer account required.' });
        }

        const addresses = await db.query(
            `SELECT * FROM CustomerAddresses WHERE CustomerKey = ? ORDER BY IsDefault DESC, CreatedAt DESC`,
            [customerKey]
        );
        res.json(addresses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/addresses
 * Add a new saved address with map coordinates (lat/lng)
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { label = 'HOME', fullName, phone, houseFlat, street, area, city, state, postalCode, country = 'India', latitude, longitude, isDefault } = req.body;

        if (!fullName || !phone || !houseFlat || !area || !city) {
            return res.status(400).json({ error: 'Full Name, Phone, House/Flat, Area, and City are required.' });
        }

        if (!customerKey) {
            return res.status(400).json({ error: 'Customer account required.' });
        }

        if (isDefault) {
            await db.run(`UPDATE CustomerAddresses SET IsDefault = 0 WHERE CustomerKey = ?`, [customerKey]);
        }

        const result = await db.run(
            `INSERT INTO CustomerAddresses (CustomerKey, Label, FullName, Phone, HouseFlat, Street, Area, City, State, PostalCode, Country, Latitude, Longitude, IsDefault)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerKey,
                (label || 'HOME').toUpperCase(),
                fullName,
                phone,
                houseFlat,
                street || houseFlat,
                area,
                city,
                state || 'Telangana',
                postalCode || '500001',
                country || 'India',
                latitude || 17.3850,
                longitude || 78.4867,
                isDefault ? 1 : 0
            ]
        );

        res.status(201).json({
            message: 'Address saved successfully!',
            addressId: result.lastID
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/addresses/:id/default
 * Set default delivery address
 */
router.put('/:id/default', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { id } = req.params;

        await db.run(`UPDATE CustomerAddresses SET IsDefault = 0 WHERE CustomerKey = ?`, [customerKey]);
        await db.run(`UPDATE CustomerAddresses SET IsDefault = 1 WHERE AddressID = ? AND CustomerKey = ?`, [id, customerKey]);

        res.json({ message: 'Default delivery address updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/addresses/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { id } = req.params;

        await db.run(`DELETE FROM CustomerAddresses WHERE AddressID = ? AND CustomerKey = ?`, [id, customerKey]);
        res.json({ message: 'Address deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
