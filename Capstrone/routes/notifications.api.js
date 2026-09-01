const express = require('express');
const router = express.Router();

/**
 * @route GET /api/notifications
 * Fetch system & user notifications
 */
router.get('/', async (req, res) => {
    try {
        res.json([
            {
                id: 'NOTIF-101',
                title: 'Order Placed Successfully',
                message: 'Your order #ORD-2026-901 has been confirmed and assigned for dispatch.',
                type: 'order',
                timestamp: new Date().toISOString(),
                read: false
            },
            {
                id: 'NOTIF-102',
                title: 'Apriori Rule Mining Completed',
                message: 'Successfully generated 12 association rules across 350 transaction baskets.',
                type: 'apriori',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                read: true
            },
            {
                id: 'NOTIF-103',
                title: 'ETL Pipeline Execution Success',
                message: 'Star schema dimension tables refreshed.',
                type: 'etl',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                read: true
            }
        ]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
