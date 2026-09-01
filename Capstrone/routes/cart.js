const express = require('express');
const router = express.Router();
const db = require('../config/database');
const aprioriService = require('../services/apriori');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route GET /api/cart
 * Fetch customer cart items with product details and Apriori cross-sell recommendations
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        if (!customerKey) {
            return res.status(400).json({ error: 'Customer account required.' });
        }

        const items = await db.query(
            `SELECT c.CartItemID, c.Quantity, p.ProductKey, p.ProductID, p.ProductName, p.Brand, p.Category, p.Price, p.OriginalPrice, p.Discount, p.StockQuantity, p.PopularityRating, p.ImageURL
             FROM CartItems c
             JOIN DimProduct p ON c.ProductKey = p.ProductKey
             WHERE c.CustomerKey = ?`,
            [customerKey]
        );

        const cartProductIDs = items.map(i => i.ProductID);
        const recommendations = await aprioriService.getRecommendationsForCart(cartProductIDs);

        let subtotal = 0;
        items.forEach(i => { subtotal += i.Price * i.Quantity; });

        res.json({
            items,
            subtotal: Number(subtotal.toFixed(2)),
            itemCount: items.reduce((acc, i) => acc + i.Quantity, 0),
            recommendations: recommendations.recommendations || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/cart
 * Add product to cart
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { productKey, quantity = 1 } = req.body;

        if (!productKey) {
            return res.status(400).json({ error: 'Product key is required.' });
        }

        const existing = await db.get(
            `SELECT * FROM CartItems WHERE CustomerKey = ? AND ProductKey = ?`,
            [customerKey, productKey]
        );

        if (existing) {
            await db.run(
                `UPDATE CartItems SET Quantity = Quantity + ? WHERE CartItemID = ?`,
                [quantity, existing.CartItemID]
            );
        } else {
            await db.run(
                `INSERT INTO CartItems (CustomerKey, ProductKey, Quantity) VALUES (?, ?, ?)`,
                [customerKey, productKey, quantity]
            );
        }

        // Log Add to Cart event
        await db.run(
            `INSERT INTO RealTimeActivity (SessionID, CustomerKey, EventType, EventData) VALUES (?, ?, ?, ?)`,
            ['SESS_APP', customerKey, 'Add to Cart', JSON.stringify({ productKey, quantity })]
        );

        res.json({ message: 'Product added to cart successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/cart/item
 * Update quantity (+/-)
 */
router.put('/item', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { productKey, quantity } = req.body;

        if (quantity <= 0) {
            await db.run(`DELETE FROM CartItems WHERE CustomerKey = ? AND ProductKey = ?`, [customerKey, productKey]);
        } else {
            await db.run(`UPDATE CartItems SET Quantity = ? WHERE CustomerKey = ? AND ProductKey = ?`, [quantity, customerKey, productKey]);
        }

        res.json({ message: 'Cart updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/cart/item/:productKey
 */
router.delete('/item/:productKey', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        const { productKey } = req.params;

        await db.run(`DELETE FROM CartItems WHERE CustomerKey = ? AND ProductKey = ?`, [customerKey, productKey]);
        res.json({ message: 'Item removed from cart.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/cart/clear
 */
router.post('/clear', authenticateToken, async (req, res) => {
    try {
        const customerKey = req.user.customerKey;
        await db.run(`DELETE FROM CartItems WHERE CustomerKey = ?`, [customerKey]);
        res.json({ message: 'Cart cleared.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
