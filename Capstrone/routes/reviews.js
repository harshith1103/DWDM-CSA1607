const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route GET /api/reviews/:productKey
 * Get customer reviews and rating distribution breakdown (5★ to 1★ %)
 */
router.get('/:productKey', async (req, res) => {
    try {
        const { productKey } = req.params;

        const reviews = await db.query(
            `SELECT r.ReviewID, r.Rating, r.Comment, r.IsVerifiedPurchase, r.CreatedAt, c.FullName as CustomerName
             FROM ProductReviews r
             JOIN DimCustomer c ON r.CustomerKey = c.CustomerKey
             WHERE r.ProductKey = ?
             ORDER BY r.CreatedAt DESC`,
            [productKey]
        );

        const stats = await db.get(
            `SELECT COUNT(*) as reviewCount, AVG(Rating) as avgRating
             FROM ProductReviews
             WHERE ProductKey = ?`,
            [productKey]
        );

        const counts = await db.query(
            `SELECT Rating, COUNT(*) as count FROM ProductReviews WHERE ProductKey = ? GROUP BY Rating`,
            [productKey]
        );

        const totalCount = stats ? stats.reviewCount : 0;
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        const distributionPercent = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 };

        if (totalCount > 0) {
            counts.forEach(row => {
                distribution[row.Rating] = row.count;
                distributionPercent[row.Rating] = Math.round((row.count / totalCount) * 100);
            });
        }

        res.json({
            productKey: parseInt(productKey),
            reviewCount: totalCount,
            avgRating: stats && stats.avgRating ? parseFloat(stats.avgRating.toFixed(1)) : 4.5,
            distribution,
            distributionPercent,
            reviews
        });
    } catch (err) {
        console.error('Error fetching product reviews:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/reviews
 * Submit a rating and review (STRICTLY REQUIRED: Product must be DELIVERED to customer)
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { productKey, rating, comment } = req.body;
        const customerKey = req.user.customerKey;

        if (!productKey || !rating) {
            return res.status(400).json({ error: 'Product key and rating (1-5) are required.' });
        }

        if (!customerKey) {
            return res.status(400).json({ error: 'Only registered customer accounts can submit reviews.' });
        }

        const numRating = parseInt(rating);
        if (numRating < 1 || numRating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
        }

        // STRICT CHECK: Rating & review can ONLY be given after product is DELIVERED
        const deliveredOrder = await db.get(
            `SELECT o.OrderID, o.Status 
             FROM Orders o
             JOIN OrderItems oi ON o.OrderID = oi.OrderID
             WHERE o.CustomerKey = ? AND oi.ProductKey = ? AND (UPPER(o.Status) = 'DELIVERED' OR UPPER(o.Status) = 'COMPLETED')`,
            [customerKey, productKey]
        );

        const factPurchase = await db.get(
            `SELECT SalesKey FROM FactSales WHERE CustomerKey = ? AND ProductKey = ?`,
            [customerKey, productKey]
        );

        const isVerifiedDelivered = !!(deliveredOrder || factPurchase);

        if (!isVerifiedDelivered) {
            return res.status(403).json({
                error: 'Verified Delivered Purchase Required: Ratings & Reviews can only be submitted after this product has been successfully delivered to your address.'
            });
        }

        const result = await db.run(
            `INSERT INTO ProductReviews (ProductKey, CustomerKey, Rating, Comment, IsVerifiedPurchase)
             VALUES (?, ?, ?, ?, 1)`,
            [productKey, customerKey, numRating, comment || '']
        );

        // Recalculate average rating for product and update DimProduct
        const stats = await db.get(
            `SELECT AVG(Rating) as avgRating FROM ProductReviews WHERE ProductKey = ?`,
            [productKey]
        );

        if (stats && stats.avgRating) {
            const updatedRating = parseFloat(stats.avgRating.toFixed(1));
            await db.run(
                `UPDATE DimProduct SET PopularityRating = ? WHERE ProductKey = ?`,
                [updatedRating, productKey]
            );
        }

        // Log Review event
        await db.run(
            `INSERT INTO RealTimeActivity (SessionID, CustomerKey, EventType, EventData) VALUES (?, ?, ?, ?)`,
            ['SESS_APP', customerKey, 'Review', JSON.stringify({ productKey, rating: numRating })]
        );

        res.status(201).json({
            message: 'Thank you! Your verified delivered product review and rating have been posted.',
            reviewId: result.lastID,
            isVerifiedPurchase: true
        });
    } catch (err) {
        console.error('Error submitting review:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/reviews/volunteer
 * Submit rating and review for a volunteer delivery agent after product delivery
 */
router.post('/volunteer', authenticateToken, async (req, res) => {
    try {
        const { orderId, volunteerUserId, rating, comment } = req.body;
        const customerKey = req.user.customerKey;

        if (!orderId || !volunteerUserId || !rating) {
            return res.status(400).json({ error: 'Order ID, Volunteer User ID, and Rating (1-5) are required.' });
        }

        if (!customerKey) {
            return res.status(400).json({ error: 'Only registered customers can submit volunteer reviews.' });
        }

        const numRating = parseInt(rating);
        if (numRating < 1 || numRating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
        }

        // Verify order belongs to customer and is DELIVERED
        const order = await db.get(
            `SELECT * FROM Orders WHERE OrderID = ? AND CustomerKey = ? AND VolunteerUserID = ? AND UPPER(Status) = 'DELIVERED'`,
            [orderId, customerKey, volunteerUserId]
        );

        if (!order) {
            return res.status(403).json({
                error: 'Order must be successfully delivered by the volunteer before submitting a rating & review.'
            });
        }

        // Prevent duplicate volunteer review for the same order (ALLOW ONLY 1)
        const existing = await db.get(
            `SELECT VolunteerReviewID FROM VolunteerReviews WHERE OrderID = ? AND CustomerKey = ?`,
            [orderId, customerKey]
        );

        if (existing) {
            return res.status(400).json({
                error: 'Feedback already submitted! Only 1 rating & review is allowed per customer order.'
            });
        }

        const result = await db.run(
            `INSERT INTO VolunteerReviews (OrderID, VolunteerUserID, CustomerKey, Rating, Comment)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, volunteerUserId, customerKey, numRating, comment || '']
        );

        res.status(201).json({
            message: 'Thank you! Your volunteer delivery rating & review have been submitted.',
            volunteerReviewId: result.lastID
        });
    } catch (err) {
        console.error('Error submitting volunteer review:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/reviews/volunteer/:volunteerUserId
 * Fetch volunteer review summary and ratings history
 */
router.get('/volunteer/:volunteerUserId', async (req, res) => {
    try {
        const { volunteerUserId } = req.params;

        const reviews = await db.query(
            `SELECT vr.VolunteerReviewID, vr.Rating, vr.Comment, vr.CreatedAt, c.FullName as CustomerName, o.OrderNumber
             FROM VolunteerReviews vr
             JOIN DimCustomer c ON vr.CustomerKey = c.CustomerKey
             JOIN Orders o ON vr.OrderID = o.OrderID
             WHERE vr.VolunteerUserID = ?
             ORDER BY vr.CreatedAt DESC`,
            [volunteerUserId]
        );

        const stats = await db.get(
            `SELECT COUNT(*) as reviewCount, AVG(Rating) as avgRating
             FROM VolunteerReviews
             WHERE VolunteerUserID = ?`,
            [volunteerUserId]
        );

        res.json({
            volunteerUserId: parseInt(volunteerUserId),
            reviewCount: stats ? stats.reviewCount : 0,
            avgRating: stats && stats.avgRating ? parseFloat(stats.avgRating.toFixed(1)) : 5.0,
            reviews
        });
    } catch (err) {
        console.error('Error fetching volunteer reviews:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

