const express = require('express');
const router = express.Router();
const aprioriService = require('../services/apriori');
const db = require('../config/database');

/**
 * @route GET /api/recommendations/rules
 * Fetch all mined Apriori association rules
 */
router.get('/rules', async (req, res) => {
    try {
        const rules = await db.query(`SELECT * FROM AssociationRules ORDER BY Lift DESC, Confidence DESC`);
        res.json(rules.map(r => ({
            ...r,
            Antecedents: JSON.parse(r.Antecedents),
            Consequents: JSON.parse(r.Consequents)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/recommendations/mine
 * Trigger Apriori algorithm dynamic re-mining with custom minSupport & minConfidence
 */
router.post('/mine', async (req, res) => {
    try {
        const minSupport = parseFloat(req.body.minSupport) || 0.03;
        const minConfidence = parseFloat(req.body.minConfidence) || 0.25;

        const result = await aprioriService.runMining(minSupport, minConfidence);
        res.json({
            message: 'Apriori association rule mining completed successfully.',
            ...result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/recommendations/cart
 * Get personalized product recommendations for a specific cart items array
 */
router.post('/cart', async (req, res) => {
    try {
        const { cartProductIds = [] } = req.body;
        const recommendations = await aprioriService.getRecommendationsForCart(cartProductIds);
        res.json(recommendations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
