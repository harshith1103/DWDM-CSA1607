const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route GET /api/wishlist
 * Fetch customer wishlist products
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        if (!customerKey) {
            return res.status(400).json({ error: 'Customer account required.' });
        }

        const items = await db.query(
            `SELECT w.WishlistID, p.*
             FROM Wishlist w
             JOIN DimProduct p ON w.ProductKey = p.ProductKey
             WHERE w.CustomerKey = ?
             ORDER BY w.CreatedAt DESC`,
            [customerKey]
        );
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/wishlist/toggle
 * Toggle product in/out of wishlist
 */
router.post('/toggle', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { productKey } = req.body;

        if (!productKey) {
            return res.status(400).json({ error: 'Product key is required.' });
        }

        const existing = await db.get(
            `SELECT * FROM Wishlist WHERE CustomerKey = ? AND ProductKey = ?`,
            [customerKey, productKey]
        );

        if (existing) {
            await db.run(`DELETE FROM Wishlist WHERE WishlistID = ?`, [existing.WishlistID]);
            res.json({ inWishlist: false, message: 'Removed from Wishlist.' });
        } else {
            await db.run(
                `INSERT INTO Wishlist (CustomerKey, ProductKey) VALUES (?, ?)`,
                [customerKey, productKey]
            );

            // Log Wishlist event
            await db.run(
                `INSERT INTO RealTimeActivity (SessionID, CustomerKey, EventType, EventData) VALUES (?, ?, ?, ?)`,
                ['SESS_APP', customerKey, 'Wishlist', JSON.stringify({ productKey })]
            );

            res.json({ inWishlist: true, message: 'Added to Wishlist ♡' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/wishlist/:productKey
 */
router.delete('/:productKey', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { productKey } = req.params;

        await db.run(`DELETE FROM Wishlist WHERE CustomerKey = ? AND ProductKey = ?`, [customerKey, productKey]);
        res.json({ message: 'Removed from Wishlist.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
