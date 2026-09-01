const express = require('express');
const router = express.Router();
const aprioriService = require('../services/apriori');

/**
 * @route GET /api/apriori/rules
 * Fetch current mined association rules
 */
router.get('/rules', async (req, res) => {
    try {
        const rules = await aprioriService.getRules();
        const mappedRules = rules.map(r => ({
            ...r,
            explanation: `Customers who buy ${r.Antecedents.join(' + ')} frequently purchase ${r.Consequents.join(' + ')} (Lift: ${r.Lift.toFixed(2)}x)`
        }));
        res.json(mappedRules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/apriori/mine
 * Execute Apriori mining with configurable support, confidence, lift
 */
router.post('/mine', async (req, res) => {
    try {
        const { minSupport = 0.03, minConfidence = 0.25, minLift = 1.0 } = req.body;
        const result = await aprioriService.runMining(parseFloat(minSupport), parseFloat(minConfidence));
        res.json({
            ...result,
            minSupport: parseFloat(minSupport),
            minConfidence: parseFloat(minConfidence),
            minLift: parseFloat(minLift)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
